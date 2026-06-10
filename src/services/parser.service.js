const cheerio = require("cheerio");

function normalizeText(value) {
	return (value || "").replace(/\s+/g, " ").trim();
}

function parseBrazilianCurrency(value) {
	if (!value) {
		return null;
	}

	const normalized = value.replace(/\./g, "").replace(",", ".");
	const parsed = Number.parseFloat(normalized);

	return Number.isNaN(parsed) ? null : parsed;
}

function extractFirstMatch(text, expression) {
	const matched = text.match(expression);
	return matched ? normalizeText(matched[1]) : null;
}

function extractField($, selectors) {
	for (const selector of selectors) {
		const value = normalizeText($(selector).first().text());

		if (value) {
			return value;
		}
	}

	return null;
}

function extractItems($) {
	const items = [];
	const seenNames = new Set();

	$("tr, li, .item, .produto, .product").each((_, element) => {
		const text = normalizeText($(element).text());

		if (!text || text.length < 6) {
			return;
		}

		const priceMatches = [...text.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g)];

		if (priceMatches.length === 0) {
			return;
		}

		const quantityMatch = text.match(/(\d+(?:,\d{1,3})?)\s*(?:x|un|und|qtde)/i);
		const unitPrice = priceMatches.length > 1 ? parseBrazilianCurrency(priceMatches[0][1]) : null;
		const totalPrice = parseBrazilianCurrency(priceMatches[priceMatches.length - 1][1]);
		const quantity = quantityMatch ? parseBrazilianCurrency(quantityMatch[1]) : 1;

		let description = text;
		description = description.replace(/(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}/g, " ");
		description = description.replace(/\d+(?:,\d{1,3})?\s*(?:x|un|und|qtde)/gi, " ");
		description = normalizeText(description);

		if (!description || seenNames.has(description.toLowerCase())) {
			return;
		}

		seenNames.add(description.toLowerCase());
		items.push({
			description,
			quantity,
			unitPrice,
			totalPrice
		});
	});

	return items;
}

function extractTotal(text) {
	const totalMatch = text.match(/(?:valor\s+a\s+pagar|total)\D{0,20}(\d{1,3}(?:\.\d{3})*,\d{2})/i);
	return totalMatch ? parseBrazilianCurrency(totalMatch[1]) : null;
}

function parseCupomHtml(html) {
	const $ = cheerio.load(html);
	const pageText = normalizeText($.root().text());

	return {
		title: extractField($, ["title", "h1", ".title", ".titulo"]),
		estabelecimento:
			extractField($, [".txtTopo", ".razao-social", ".emitente", "strong"]) ||
			extractFirstMatch(pageText, /(?:emitente|razao social)\D{0,10}(.+?)(?:cnpj|cpf|ie)/i),
		cnpj: extractFirstMatch(pageText, /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/),
		emittedAt:
			extractFirstMatch(pageText, /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/) ||
			extractFirstMatch(pageText, /(\d{2}\/\d{2}\/\d{4})/),
		accessKey: extractFirstMatch(pageText, /(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/),
		total: extractTotal(pageText),
		items: extractItems($),
		rawHtmlLength: html.length
	};
}

module.exports = parseCupomHtml;
