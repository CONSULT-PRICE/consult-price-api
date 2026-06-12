const { MongoClient } = require("mongodb");
const { logError, logInfo } = require("./logger.service");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const databaseName = process.env.MONGODB_DB_NAME || "consult-price";
const mongoConnectTimeoutMs = Number.parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || "5000", 10);
const mongoServerSelectionTimeoutMs = Number.parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || "5000", 10);

let clientPromise;

function getMongoTarget() {
	try {
		const parsed = new URL(mongoUri);
		return {
			protocol: parsed.protocol,
			host: parsed.host,
			databaseName
		};
	} catch {
		return {
			protocol: null,
			host: null,
			databaseName
		};
	}
}

function normalizeMongoError(error) {
	const message = String(error && error.message ? error.message : "");
	const causeMessage = String(error && error.cause && error.cause.message ? error.cause.message : "");
	const combinedMessage = `${message} ${causeMessage}`.toLowerCase();

	if (error && error.name === "MongoParseError") {
		const parseError = new Error("A URI do MongoDB e invalida. Verifique o formato de MONGODB_URI.");
		parseError.statusCode = 500;
		parseError.code = "MONGO_URI_INVALID";
		parseError.cause = error;
		return parseError;
	}

	if (combinedMessage.includes("authentication failed") || combinedMessage.includes("auth failed")) {
		const authError = new Error(
			"Falha de autenticacao no MongoDB. Verifique usuario, senha e authSource da conexao."
		);
		authError.statusCode = 503;
		authError.code = "MONGO_AUTH_FAILED";
		authError.cause = error;
		return authError;
	}

	if (error && error.name === "MongoServerSelectionError") {
		const connectionError = new Error(
			"Nao foi possivel conectar ao MongoDB. Verifique se o servidor esta ativo, a porta esta aberta e a URI esta correta."
		);
		connectionError.statusCode = 503;
		connectionError.code = "MONGO_UNREACHABLE";
		connectionError.cause = error;
		return connectionError;
	}

	return error;
}

function getMongoClient() {
	if (!clientPromise) {
		logInfo("mongodb.connect.started", {
			mongoTarget: getMongoTarget(),
			databaseName,
			connectTimeoutMs: mongoConnectTimeoutMs,
			serverSelectionTimeoutMs: mongoServerSelectionTimeoutMs
		});

		const client = new MongoClient(mongoUri, {
			connectTimeoutMS: mongoConnectTimeoutMs,
			serverSelectionTimeoutMS: mongoServerSelectionTimeoutMs
		});
		clientPromise = client.connect().catch((error) => {
			const normalizedError = normalizeMongoError(error);

			logError("mongodb.connect.failed", normalizedError, {
				mongoTarget: getMongoTarget(),
				databaseName,
				connectTimeoutMs: mongoConnectTimeoutMs,
				serverSelectionTimeoutMs: mongoServerSelectionTimeoutMs
			});

			clientPromise = undefined;
			throw normalizedError;
		});

		clientPromise = clientPromise.then((connectedClient) => {
			logInfo("mongodb.connect.finished", {
				mongoTarget: getMongoTarget(),
				databaseName,
				connectTimeoutMs: mongoConnectTimeoutMs,
				serverSelectionTimeoutMs: mongoServerSelectionTimeoutMs
			});

			return connectedClient;
		});
	}

	return clientPromise;
}

async function getDatabase() {
	const client = await getMongoClient();
	return client.db(databaseName);
}

async function pingDatabase() {
	const database = await getDatabase();
	return database.command({ ping: 1 });
}

module.exports = {
	getDatabase,
	getMongoClient,
	databaseName,
	getMongoTarget,
	normalizeMongoError,
	pingDatabase
};