const { databaseName, getDatabase, normalizeMongoError } = require("./mongo.service");
const { logError, logInfo } = require("./logger.service");

const collectionName = process.env.MONGODB_COLLECTION_NAME || "cupons";

async function saveCupom(document) {
	try {
		logInfo("mongodb.insert.started", {
			databaseName,
			collectionName,
			estabelecimento: document.estabelecimento,
			itemCount: document.itemCount
		});

		const database = await getDatabase();
		const result = await database.collection(collectionName).insertOne(document);

		logInfo("mongodb.insert.finished", {
			databaseName,
			collectionName,
			insertedId: result.insertedId.toString()
		});

		return {
			_id: result.insertedId.toString(),
			...document,
			storage: {
				database: databaseName,
				collection: collectionName
			}
		};
	} catch (error) {
		const databaseError = normalizeMongoError(error);

		if (databaseError !== error) {
			logError("mongodb.connection_failed", databaseError, {
				databaseName,
				collectionName
			});

			throw databaseError;
		}

		logError("mongodb.insert_failed", error, {
			databaseName,
			collectionName
		});

		throw error;
	}
}

module.exports = saveCupom;