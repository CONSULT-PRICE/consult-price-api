function validateUrl(value) {
	try {
		const parsedUrl = new URL(value);
		return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
	} catch {
		return false;
	}
}

async function fetchBufferFromUrl(url, acceptHeader) {
	if (!validateUrl(url)) {
		const error = new Error('A URL enviada em "sourceUrl", "qrCode" ou "qrCodeImageUrl" e invalida.');
		error.statusCode = 400;
		throw error;
	}

	const response = await fetch(url, {
		headers: {
			"user-agent": "consult-price-api/1.0",
			accept: acceptHeader
		}
	});

	if (!response.ok) {
		const error = new Error(`Nao foi possivel baixar o conteudo remoto. Status ${response.status}.`);
		error.statusCode = 502;
		throw error;
	}

	return Buffer.from(await response.arrayBuffer());
}

async function fetchCupomHtml(url) {
	const buffer = await fetchBufferFromUrl(url, "text/html,application/xhtml+xml");
	return buffer.toString("utf-8");
}

module.exports = {
	fetchBufferFromUrl,
	fetchCupomHtml,
	validateUrl
};
