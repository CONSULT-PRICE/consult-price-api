const cheerio = require("cheerio");

function normalizeText(value) {
	return (value || "").replace(/\s+/g, " ").trim();
}

function parseLocalizedNumber(value) {
	if (!value) {
		return null;
	}

	const normalizedValue = normalizeText(String(value)).replace(/R\$\s*/gi, "");
	const hasComma = normalizedValue.includes(",");
	const hasDot = normalizedValue.includes(".");
	let normalized = normalizedValue;

	if (hasComma && hasDot) {
		normalized = normalizedValue.replace(/\./g, "").replace(/,/g, ".");
	} else if (hasComma) {
		normalized = normalizedValue.replace(/,/g, ".");
	}

	const parsed = Number.parseFloat(normalized);

	return Number.isNaN(parsed) ? null : parsed;
}

function parseBrazilianCurrency(value) {
	return parseLocalizedNumber(value);
}

function extractFirstMatch(text, expression) {
	const matched = text.match(expression);
	return matched ? normalizeText(matched[1]) : null;
}

function formatCnpj(value) {
	const digits = String(value || "").replace(/\D/g, "");

	if (digits.length !== 14) {
		return normalizeText(value) || null;
	}

	return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function roundNumber(value, decimalPlaces = 4) {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return null;
	}

	return Number(value.toFixed(decimalPlaces));
}

function extractTableRows($table, $) {
	const rows = [];

	$table.find("tr").each((_, row) => {
		const cells = $(row)
			.find("th, td")
			.map((__, cell) => normalizeText($(cell).text()))
			.get()
			.filter(Boolean);

		if (cells.length > 0) {
			rows.push(cells);
		}
	});

	return rows;
}

function findTableByHeaders($, expectedHeaders) {
	const normalizedHeaders = expectedHeaders.map((header) => normalizeText(header).toLowerCase());

	for (const table of $("table.table-hover").toArray()) {
		const rows = extractTableRows($(table), $);
		const headers = (rows[0] || []).map((header) => header.toLowerCase());

		if (
			headers.length === normalizedHeaders.length &&
			headers.every((header, index) => header === normalizedHeaders[index])
		) {
			return rows;
		}
	}

	return null;
}

function extractSummaryFromStrongTags($) {
	const strongTexts = $("strong")
		.map((_, element) => normalizeText($(element).text()))
		.get()
		.filter(Boolean);
	const summary = {};

	for (let index = 0; index < strongTexts.length - 1; index += 2) {
		summary[strongTexts[index]] = strongTexts[index + 1];
	}

	return summary;
}

function extractAccessKeyFromRows(rows) {
	const rawValue = rows && rows[1] && rows[1][0] ? rows[1][0] : rows && rows[0] && rows[0][0] ? rows[0][0] : null;

	if (!rawValue) {
		return {
			accessKey: null,
			accessKeyFormatted: null
		};
	}

	const digits = rawValue.replace(/\D/g, "");

	return {
		accessKey: digits.length >= 44 ? digits.slice(0, 44) : digits || null,
		accessKeyFormatted: rawValue
	};
}

function extractTaxes(rawText) {
	const normalized = normalizeText(rawText);

	if (!normalized) {
		return {
			raw: null,
			total: null,
			federalPercent: null,
			statePercent: null,
			municipalPercent: null
		};
	}

	return {
		raw: normalized,
		total: parseLocalizedNumber(extractFirstMatch(normalized, /Total R\$\s*([\d.,]+)/i)),
		federalPercent: parseLocalizedNumber(extractFirstMatch(normalized, /([\d.,]+)%\s*Federal/i)),
		statePercent: parseLocalizedNumber(extractFirstMatch(normalized, /([\d.,]+)%\s*Estadual/i)),
		municipalPercent: parseLocalizedNumber(extractFirstMatch(normalized, /([\d.,]+)%\s*Municipal/i))
	};
}

function extractItemsFromMgTable($) {
	const itemsTable = $("table.table-striped").first();

	if (itemsTable.length === 0) {
		return [];
	}

	return itemsTable
		.find("tr")
		.map((_, row) => {
			const cells = $(row)
				.find("td")
				.map((__, cell) => normalizeText($(cell).text()))
				.get();

			if (cells.length < 4) {
				return null;
			}

			const descriptionCell = cells[0];
			const quantityCell = cells[1];
			const unitCell = cells[2];
			const totalCell = cells[3];
			const codeMatch = descriptionCell.match(/^(.*?)\s*\(C[oó]digo:\s*([^\)]+)\)$/i);
			const description = normalizeText(codeMatch ? codeMatch[1] : descriptionCell);
			const code = codeMatch ? normalizeText(codeMatch[2]) : null;
			const quantity = parseLocalizedNumber(extractFirstMatch(quantityCell, /Qtde total de [ií]tens:\s*([\d.,]+)/i));
			const unit = extractFirstMatch(unitCell, /UN:\s*(.+)$/i);
			const totalPrice = parseBrazilianCurrency(extractFirstMatch(totalCell, /Valor total R\$:\s*R\$\s*([\d.,]+)/i));
			const unitPrice = quantity && totalPrice ? roundNumber(totalPrice / quantity) : totalPrice;

			return {
				description,
				code,
				quantity,
				unit,
				unitPrice,
				totalPrice
			};
		})
		.get()
		.filter(Boolean);
}

function parseMgCupom($, html) {
	const centeredTableRows = extractTableRows($("table.table.text-center").first(), $);
	const issuerRows = findTableByHeaders($, ["Nome / Razão Social", "CNPJ", "Inscrição Estadual", "UF"]);
	const consumerRows = findTableByHeaders($, ["Nome / Razão Social", "UF"]);
	const operationRows = findTableByHeaders($, ["Destino da operação", "Consumidor final", "Presença do Comprador"]);
	const noteRows = findTableByHeaders($, ["Modelo", "Série", "Número", "Data Emissão"]);
	const totalsRows = findTableByHeaders($, ["Valor total do serviço", "Base de Cálculo ICMS", "Valor ICMS"]);
	const protocolRows = findTableByHeaders($, ["Protocolo"]);
	const accessKeyRows = $("table.table-hover")
		.toArray()
		.map((table) => extractTableRows($(table), $))
		.find((rows) => rows.length > 0 && rows.flat().join(" ").replace(/\D/g, "").length >= 44) ||
		findTableByHeaders($, ["Chave de acesso"]);
	const complementaryRows = findTableByHeaders($, ["Descrição"]);
	const summary = extractSummaryFromStrongTags($);
	const accessKeyInfo = extractAccessKeyFromRows(accessKeyRows);
	const items = extractItemsFromMgTable($);
	const issuerName = issuerRows && issuerRows[1] ? issuerRows[1][0] : centeredTableRows[1] && centeredTableRows[1][0];
	const issuerCnpj = issuerRows && issuerRows[1] ? issuerRows[1][1] : extractFirstMatch(centeredTableRows[2] ? centeredTableRows[2][0] : "", /CNPJ:\s*([\d./-]+)/i);
	const issuerStateRegistration = issuerRows && issuerRows[1] ? issuerRows[1][2] : extractFirstMatch(centeredTableRows[2] ? centeredTableRows[2][0] : "", /Inscri[cç][aã]o Estadual:\s*([\d.]+)/i);
	const issuerUf = issuerRows && issuerRows[1] ? issuerRows[1][3] : extractFirstMatch(centeredTableRows[3] ? centeredTableRows[3][0] : "", /,\s*([A-Z]{2})$/);
	const address = centeredTableRows[3] && centeredTableRows[3][0] ? centeredTableRows[3][0] : null;
	const rawAdditionalInfo = complementaryRows && complementaryRows[1] ? complementaryRows[1][0] : null;

	return {
		title: centeredTableRows[0] && centeredTableRows[0][0] ? centeredTableRows[0][0] : null,
		estabelecimento: issuerName || null,
		cnpj: formatCnpj(issuerCnpj),
		emittedAt: noteRows && noteRows[1] ? noteRows[1][3] : null,
		accessKey: accessKeyInfo.accessKey,
		accessKeyFormatted: accessKeyInfo.accessKeyFormatted,
		total: totalsRows && totalsRows[1] ? parseBrazilianCurrency(totalsRows[1][0]) : parseLocalizedNumber(summary["Valor total R$"]),
		items,
		itemCount: parseLocalizedNumber(summary["Qtde total de ítens"]) || items.length,
		rawHtmlLength: html.length,
		emitente: {
			nome: issuerName || null,
			cnpj: formatCnpj(issuerCnpj),
			inscricaoEstadual: issuerStateRegistration || null,
			uf: issuerUf || null,
			endereco: address
		},
		consumidor: {
			nome: consumerRows && consumerRows[1] ? consumerRows[1][0] || null : null,
			uf: consumerRows && consumerRows[1] ? consumerRows[1][1] || null : null
		},
		nota: {
			modelo: noteRows && noteRows[1] ? noteRows[1][0] : null,
			serie: noteRows && noteRows[1] ? noteRows[1][1] : null,
			numero: noteRows && noteRows[1] ? noteRows[1][2] : null,
			dataEmissao: noteRows && noteRows[1] ? noteRows[1][3] : null,
			protocolo: protocolRows && protocolRows[1] ? protocolRows[1][0] : null,
			chaveAcesso: accessKeyInfo.accessKey,
			chaveAcessoFormatada: accessKeyInfo.accessKeyFormatted
		},
		totais: {
			qtdItens: parseLocalizedNumber(summary["Qtde total de ítens"]) || items.length,
			valorTotal: totalsRows && totalsRows[1] ? parseBrazilianCurrency(totalsRows[1][0]) : parseLocalizedNumber(summary["Valor total R$"]),
			valorPago: parseLocalizedNumber(summary["Valor pago R$"]),
			baseCalculoIcms: totalsRows && totalsRows[1] ? parseBrazilianCurrency(totalsRows[1][1]) : null,
			valorIcms: totalsRows && totalsRows[1] ? parseBrazilianCurrency(totalsRows[1][2]) : null
		},
		pagamento: {
			forma: summary["Forma de Pagamento"] || null
		},
		operacao: {
			destino: operationRows && operationRows[1] ? operationRows[1][0] : null,
			consumidorFinal: operationRows && operationRows[1] ? operationRows[1][1] : null,
			presencaComprador: operationRows && operationRows[1] ? operationRows[1][2] : null
		},
		tributos: extractTaxes(rawAdditionalInfo),
		informacoesAdicionais: rawAdditionalInfo
	};
}

function parseGenericCupom($, html) {
	const pageText = normalizeText($.root().text());

	return {
		title: extractFirstMatch(pageText, /(Nota Fiscal de Consumidor Eletr[oô]nica \(NFC-e\))/i) || null,
		estabelecimento: extractFirstMatch(pageText, /(?:emitente|razao social)\D{0,10}(.+?)(?:cnpj|cpf|ie)/i),
		cnpj: formatCnpj(extractFirstMatch(pageText, /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/)),
		emittedAt:
			extractFirstMatch(pageText, /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/) ||
			extractFirstMatch(pageText, /(\d{2}\/\d{2}\/\d{4})/),
		accessKey: extractFirstMatch(pageText, /(\d{44})/),
		total: parseLocalizedNumber(extractFirstMatch(pageText, /(?:valor\s+a\s+pagar|valor total)\D{0,20}([\d.,]+)/i)),
		items: [],
		itemCount: null,
		rawHtmlLength: html.length,
		emitente: null,
		consumidor: null,
		nota: null,
		totais: null,
		pagamento: null,
		operacao: null,
		tributos: null,
		informacoesAdicionais: null
	};
}

function isMgReceiptLayout($) {
	return $("table.table-striped").length > 0 && $("table.table-hover").length > 0;
}

function parseCupomHtml(html) {
	const $ = cheerio.load(html);

	if (isMgReceiptLayout($)) {
		return parseMgCupom($, html);

	}

	return parseGenericCupom($, html);
}

module.exports = parseCupomHtml;
