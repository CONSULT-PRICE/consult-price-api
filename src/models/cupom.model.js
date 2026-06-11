function createCupomDocument(data) {
	return {
		estabelecimento: data.estabelecimento,
		cnpj: data.cnpj,
		emittedAt: data.emittedAt,
		accessKey: data.accessKey,
		total: data.total,
		items: data.items,
		itemCount: data.itemCount,
		emitente: data.emitente,
		consumidor: data.consumidor,
		nota: data.nota,
		totais: data.totais,
		pagamento: data.pagamento,
		operacao: data.operacao,
		tributos: data.tributos,
		informacoesAdicionais: data.informacoesAdicionais,
		source: data.source,
		metadata: data.metadata
	};
}

module.exports = createCupomDocument;
