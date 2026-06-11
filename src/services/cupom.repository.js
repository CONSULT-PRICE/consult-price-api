const { databaseName, getDatabase } = require("./mongo.service");

const collectionName = process.env.MONGODB_COLLECTION_NAME || "cupons";

async function saveCupom(document) {
	try {
		const database = await getDatabase();
		const result = await database.collection(collectionName).insertOne(document);

		return {
			_id: result.insertedId.toString(),
			...document,
			storage: {
				database: databaseName,
				collection: collectionName
			}
		};
	} catch (error) {
		if (error && error.name === "MongoServerSelectionError") {
			const databaseError = new Error(
				"Nao foi possivel conectar ao MongoDB local. Verifique se o servidor esta ativo e se a URI esta correta."
			);
			databaseError.statusCode = 503;
			databaseError.cause = error;
			throw databaseError;
		}

		throw error;
	}
}

module.exports = saveCupom;