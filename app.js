require("dotenv").config();

const express = require("express");
const { randomUUID } = require("crypto");

const cupomRoutes = require("./src/routes/cupom.routes");
const { logError, logInfo } = require("./src/services/logger.service");
const { pingDatabase } = require("./src/services/mongo.service");

const app = express();

app.use(express.json({ limit: "2mb" }));

app.use((request, response, next) => {
	const requestId = randomUUID();
	const startedAt = Date.now();

	request.requestId = requestId;
	response.setHeader("x-request-id", requestId);

	logInfo("request.started", {
		requestId,
		method: request.method,
		path: request.originalUrl
	});

	response.on("finish", () => {
		logInfo("request.finished", {
			requestId,
			method: request.method,
			path: request.originalUrl,
			statusCode: response.statusCode,
			durationMs: Date.now() - startedAt
		});
	});

	next();
});

app.get("/health", (_request, response) => {
	response.json({ status: "ok" });
});

app.get("/health/db", async (_request, response, next) => {
	try {
		await pingDatabase();
		response.json({ status: "ok", database: "connected" });
	} catch (error) {
		next(error);
	}
});

app.use("/cupom", cupomRoutes);

app.use((error, request, response, _next) => {
	const statusCode = error.statusCode || 500;
	const message = error.message || "Erro interno ao processar a requisicao.";
	const requestId = request && request.requestId ? request.requestId : null;

	logError("request.failed", error, {
		requestId,
		method: request ? request.method : null,
		path: request ? request.originalUrl : null,
		statusCode
	});

	response.status(statusCode).json({ error: message, requestId });
});

if (require.main === module) {
	const port = process.env.PORT || 3000;

	app.listen(port, () => {
		logInfo("server.started", {
			port,
			pid: process.pid
		});
	});
}

module.exports = app;
