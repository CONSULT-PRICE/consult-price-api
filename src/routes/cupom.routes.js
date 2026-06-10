const express = require("express");

const createCupomDocument = require("../models/cupom.model");
const parseCupomHtml = require("../services/parser.service");
const transformCupom = require("../services/transformer.service");

const router = express.Router();

router.post("/", (request, response, next) => {
	try {
		const { html, qrCode, sourceUrl } = request.body || {};

		if (typeof html !== "string" || html.trim().length === 0) {
			const error = new Error('Envie o campo "html" com o conteudo do cupom.');
			error.statusCode = 400;
			throw error;
		}

		const parsedCupom = parseCupomHtml(html);
		const transformedCupom = transformCupom(parsedCupom, { qrCode, sourceUrl });
		const document = createCupomDocument(transformedCupom);

		response.status(200).json(document);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
