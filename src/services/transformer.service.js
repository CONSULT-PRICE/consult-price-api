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
		itemCount: parsedCupom.items.length,
		metadata: {
			title: parsedCupom.title || null,
			rawHtmlLength: parsedCupom.rawHtmlLength
		}
	};
}

module.exports = transformCupom;
