const { logError, logInfo } = require("./logger.service");

const remoteFetchTimeoutMs = Number.parseInt(process.env.REMOTE_FETCH_TIMEOUT_MS || "15000", 10);

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

	logInfo("remote_fetch.started", {
		url,
		acceptHeader,
		timeoutMs: remoteFetchTimeoutMs
	});

	let response;
	const controller = new AbortController();
	const timeoutHandle = setTimeout(() => {
		controller.abort();
	}, remoteFetchTimeoutMs);

	try {
		response = await fetch(url, {
			headers: {
				"user-agent": "consult-price-api/1.0",
				accept: acceptHeader
			},
			signal: controller.signal
		});
	} catch (error) {
		const fetchError = new Error(`Erro ao buscar o conteudo remoto em ${url}.`);
		fetchError.statusCode = 502;
		fetchError.code = error.name === "AbortError" ? "FETCH_TIMEOUT" : error.code || "FETCH_ERROR";
		fetchError.cause = error;

		logError("remote_fetch.failed", fetchError, {
			url,
			acceptHeader,
			timeoutMs: remoteFetchTimeoutMs
		});

		throw fetchError;
	} finally {
		clearTimeout(timeoutHandle);
	}

	if (!response.ok) {
		const error = new Error(`Nao foi possivel baixar o conteudo remoto. Status ${response.status}.`);
		error.statusCode = 502;

		logError("remote_fetch.bad_status", error, {
			url,
			acceptHeader,
			responseStatus: response.status,
			timeoutMs: remoteFetchTimeoutMs
		});

		throw error;
	}

	logInfo("remote_fetch.finished", {
		url,
		acceptHeader,
		responseStatus: response.status,
		timeoutMs: remoteFetchTimeoutMs
	});

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
