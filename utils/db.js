/*eslint-disable*/
import { MongoClient, ObjectId } from 'mongodb';
// import dotenv from 'dotenv';

// // Load environment variable
// dotenv.config();

class DBClient {
    constructor() {
        // Retrieve MongoDB connection details from environment variables or use defaults
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';
        // Construct MongoDB URI
        const uri = `mongodb://${host}:${port}/${database}`;
        this.client = new MongoClient(uri, { useUnifiedTopology: true});

        // Attempt to connect to MongoDB
        this.client.connect()
        .then(() => {
            this.db = this.client.db(database);
            console.log(`Connected to database: ${database}`);
        })
        .catch((err) => {
            console.error(`Error connecting to database: ${err}`);
        });
    }

    // Check if MongoDB connection is live
    isAlive() {
        return this.client.isConnected();
    }

    // Get number of documents in the 'users' collection
    async nbUsers() {
        const filesCollection = this.db.collection('users');
        return await filesCollection.countDocuments();
    }

    // Get number of documents in the 'files' collection
    async nbFiles() {
        const filesCollection = this.db.collection('files');
        return await filesCollection.countDocuments();
    }

    ObjectId(id) {
        return ObjectId(id);
    }
}

const dbCLient = new DBClient();
module.exports = dbCLient;