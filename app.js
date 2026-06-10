const express = require("express");

const cupomRoutes = require("./src/routes/cupom.routes");

const app = express();

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) => {
	response.json({ status: "ok" });
});

app.use("/cupom", cupomRoutes);

app.use((error, _request, response, _next) => {
	const statusCode = error.statusCode || 500;
	const message = error.message || "Erro interno ao processar a requisicao.";

	response.status(statusCode).json({ error: message });
});

if (require.main === module) {
	const port = process.env.PORT || 3000;

	app.listen(port, () => {
		console.log(`API pronta na porta ${port}`);
	});
}

module.exports = app;
