function createCupomDocument(data) {
	return {
		estabelecimento: data.estabelecimento,
		cnpj: data.cnpj,
		emittedAt: data.emittedAt,
		accessKey: data.accessKey,
		total: data.total,
		items: data.items,
		itemCount: data.itemCount,
		source: data.source,
		metadata: data.metadata
	};
}

module.exports = createCupomDocument;
