const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const databaseName = process.env.MONGODB_DB_NAME || "consult-price";

let clientPromise;

function getMongoClient() {
	if (!clientPromise) {
		const client = new MongoClient(mongoUri);
		clientPromise = client.connect().catch((error) => {
			clientPromise = undefined;
			throw error;
		});
	}

	return clientPromise;
}

async function getDatabase() {
	const client = await getMongoClient();
	return client.db(databaseName);
}

module.exports = {
	getDatabase,
	getMongoClient,
	databaseName
};