const { Jimp } = require("jimp");
const QrCodeReader = require("qrcode-reader");

const { fetchBufferFromUrl, validateUrl } = require("./fetcher.service");

function normalizeBase64Image(imageBase64) {
	if (typeof imageBase64 !== "string" || imageBase64.trim().length === 0) {
		const error = new Error('Envie uma imagem valida em "qrCodeImageBase64".');
		error.statusCode = 400;
		throw error;
	}

	const normalized = imageBase64.includes(",") ? imageBase64.split(",").pop() : imageBase64;
	return Buffer.from(normalized, "base64");
}

function decodeQrBuffer(buffer) {
	return new Promise((resolve, reject) => {
		const qrReader = new QrCodeReader();

		qrReader.callback = (error, value) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(value ? value.result : null);
		};

		Jimp.read(buffer)
			.then((image) => {
				qrReader.decode(image.bitmap);
			})
			.catch(reject);
	});
}

async function readQrCodeImage({ imageUrl, imageBase64 }) {
	let buffer;

	if (typeof imageUrl === "string" && imageUrl.trim().length > 0) {
		if (!validateUrl(imageUrl)) {
			const error = new Error('A URL enviada em "qrCodeImageUrl" e invalida.');
			error.statusCode = 400;
			throw error;
		}

		buffer = await fetchBufferFromUrl(imageUrl, "image/*");
	} else if (typeof imageBase64 === "string" && imageBase64.trim().length > 0) {
		buffer = normalizeBase64Image(imageBase64);
	} else {
		const error = new Error('Envie "qrCodeImageUrl" ou "qrCodeImageBase64" para ler o QR Code.');
		error.statusCode = 400;
		throw error;
	}

	const decodedValue = await decodeQrBuffer(buffer);

	if (typeof decodedValue !== "string" || decodedValue.trim().length === 0) {
		const error = new Error("Nao foi possivel ler o QR Code da imagem enviada.");
		error.statusCode = 422;
		throw error;
	}

	return decodedValue.trim();
}

module.exports = readQrCodeImage;