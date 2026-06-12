const express = require("express");

const createCupomDocument = require("../models/cupom.model");
const saveCupom = require("../services/cupom.repository");
const { fetchCupomHtml } = require("../services/fetcher.service");
const { logInfo } = require("../services/logger.service");
const parseCupomHtml = require("../services/parser.service");
const readQrCodeImage = require("../services/qr-reader.service");
const transformCupom = require("../services/transformer.service");

const router = express.Router();

async function resolveCupomHtml({ html, qrCode, sourceUrl, qrCodeImageUrl, qrCodeImageBase64 }) {
	if (typeof html === "string" && html.trim().length > 0) {
		return {
			html,
			resolvedQrCode: qrCode || null,
			resolvedSourceUrl: sourceUrl || qrCode || null,
			resolutionSource: "body.html"
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
		resolvedSourceUrl,
		resolutionSource: sourceUrl ? "body.sourceUrl" : resolvedQrCode ? "qr.resolvedUrl" : null
	};
}

router.post("/", async (request, response, next) => {
	try {
		logInfo("cupom.request.received", {
			requestId: request.requestId,
			hasHtml: typeof request.body?.html === "string" && request.body.html.trim().length > 0,
			hasQrCode: typeof request.body?.qrCode === "string" && request.body.qrCode.trim().length > 0,
			hasSourceUrl: typeof request.body?.sourceUrl === "string" && request.body.sourceUrl.trim().length > 0,
			hasQrCodeImageUrl:
				typeof request.body?.qrCodeImageUrl === "string" && request.body.qrCodeImageUrl.trim().length > 0,
			hasQrCodeImageBase64:
				typeof request.body?.qrCodeImageBase64 === "string" && request.body.qrCodeImageBase64.trim().length > 0
		});

		const { html, qrCode, sourceUrl, qrCodeImageUrl, qrCodeImageBase64 } = request.body || {};
		const resolvedInput = await resolveCupomHtml({
			html,
			qrCode,
			sourceUrl,
			qrCodeImageUrl,
			qrCodeImageBase64
		});

		logInfo("cupom.request.resolved_input", {
			requestId: request.requestId,
			resolutionSource: resolvedInput.resolutionSource,
			resolvedSourceUrl: resolvedInput.resolvedSourceUrl,
			htmlLength: resolvedInput.html.length
		});

		const parsedCupom = parseCupomHtml(resolvedInput.html);
		const transformedCupom = transformCupom(parsedCupom, {
			qrCode: resolvedInput.resolvedQrCode,
			sourceUrl: resolvedInput.resolvedSourceUrl
		});
		const document = createCupomDocument(transformedCupom);
		const persistedCupom = await saveCupom(document);

		logInfo("cupom.request.persisted", {
			requestId: request.requestId,
			cupomId: persistedCupom._id,
			itemCount: persistedCupom.itemCount,
			estabelecimento: persistedCupom.estabelecimento
		});

		response.status(201).json(persistedCupom);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
