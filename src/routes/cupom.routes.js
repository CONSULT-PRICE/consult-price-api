const express = require("express");

const createCupomDocument = require("../models/cupom.model");
const saveCupom = require("../services/cupom.repository");
const { fetchCupomHtml } = require("../services/fetcher.service");
const parseCupomHtml = require("../services/parser.service");
const readQrCodeImage = require("../services/qr-reader.service");
const transformCupom = require("../services/transformer.service");

const router = express.Router();

async function resolveCupomHtml({ html, qrCode, sourceUrl, qrCodeImageUrl, qrCodeImageBase64 }) {
	if (typeof html === "string" && html.trim().length > 0) {
		return {
			html,
			resolvedQrCode: qrCode || null,
			resolvedSourceUrl: sourceUrl || qrCode || null
		};
	}

	let resolvedQrCode = typeof qrCode === "string" && qrCode.trim().length > 0 ? qrCode : null;

	if (!resolvedQrCode && typeof qrCodeImageUrl === "string" && qrCodeImageUrl.trim().length > 0) {
		resolvedQrCode = await readQrCodeImage({ imageUrl: qrCodeImageUrl });
	}

	if (!resolvedQrCode && typeof qrCodeImageBase64 === "string" && qrCodeImageBase64.trim().length > 0) {
		resolvedQrCode = await readQrCodeImage({ imageBase64: qrCodeImageBase64 });
	}

	const resolvedSourceUrl = sourceUrl || resolvedQrCode;

	if (typeof resolvedSourceUrl !== "string" || resolvedSourceUrl.trim().length === 0) {
		const error = new Error('Envie "html", "sourceUrl", "qrCode", "qrCodeImageUrl" ou "qrCodeImageBase64".');
		error.statusCode = 400;
		throw error;
	}

	const fetchedHtml = await fetchCupomHtml(resolvedSourceUrl);

	return {
		html: fetchedHtml,
		resolvedQrCode,
		resolvedSourceUrl
	};
}

router.post("/", async (request, response, next) => {
	try {
		const { html, qrCode, sourceUrl, qrCodeImageUrl, qrCodeImageBase64 } = request.body || {};
		const resolvedInput = await resolveCupomHtml({
			html,
			qrCode,
			sourceUrl,
			qrCodeImageUrl,
			qrCodeImageBase64
		});
		const parsedCupom = parseCupomHtml(resolvedInput.html);
		const transformedCupom = transformCupom(parsedCupom, {
			qrCode: resolvedInput.resolvedQrCode,
			sourceUrl: resolvedInput.resolvedSourceUrl
		});
		const document = createCupomDocument(transformedCupom);
		const persistedCupom = await saveCupom(document);

		response.status(201).json(persistedCupom);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
