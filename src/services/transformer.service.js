function transformCupom(parsedCupom, source = {}) {
	return {
		source: {
			qrCode: source.qrCode || null,
			sourceUrl: source.sourceUrl || null,
			importedAt: new Date().toISOString()
		},
		estabelecimento: parsedCupom.estabelecimento || null,
		cnpj: parsedCupom.cnpj || null,
		emittedAt: parsedCupom.emittedAt || null,
		accessKey: parsedCupom.accessKey || null,
		total: parsedCupom.total,
		items: parsedCupom.items,
		itemCount: parsedCupom.itemCount || parsedCupom.items.length,
		emitente: parsedCupom.emitente || null,
		consumidor: parsedCupom.consumidor || null,
		nota: parsedCupom.nota || null,
		totais: parsedCupom.totais || null,
		pagamento: parsedCupom.pagamento || null,
		operacao: parsedCupom.operacao || null,
		tributos: parsedCupom.tributos || null,
		informacoesAdicionais: parsedCupom.informacoesAdicionais || null,
		metadata: {
			title: parsedCupom.title || null,
			rawHtmlLength: parsedCupom.rawHtmlLength,
			accessKeyFormatted: parsedCupom.accessKeyFormatted || null
		}
	};
}

module.exports = transformCupom;
