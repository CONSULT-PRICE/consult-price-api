function stringifyEntry(level, event, details = {}) {
	return JSON.stringify({
		timestamp: new Date().toISOString(),
		level,
		event,
		...details
	});
}

function serializeError(error) {
	if (!error) {
		return null;
	}

	return {
		name: error.name || "Error",
		message: error.message || "Erro sem mensagem.",
		stack: error.stack || null,
		code: error.code || null,
		statusCode: error.statusCode || null,
		cause: error.cause
			? {
				name: error.cause.name || null,
				message: error.cause.message || null,
				code: error.cause.code || null
			}
			: null
	};
}

function logInfo(event, details) {
	console.log(stringifyEntry("info", event, details));
}

function logError(event, error, details = {}) {
	console.error(
		stringifyEntry("error", event, {
			...details,
			error: serializeError(error)
		})
	);
}

module.exports = {
	logError,
	logInfo,
	serializeError
};