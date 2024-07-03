const { MongoClient } = require('mongodb');

class DBClient {
    constructor() {
        this.host = process.env.DB_HOST || 'localhost';
        this.port = process.env.DB_PORT || 27017;
        this.database = process.env.DB_DATABASE || 'files_manager';
        this.client = new MongoClient(`mongodb://${this.host}:${this.port}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        this.connect();
    }

    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to MongoDB');
        } catch (err) {
            console.error('Error connecting to MongoDB:', err);
        }
    }

    isAlive() {
        return !!this.client && this.client.isConnected();
    }

    async nbUsers() {
        try {
            const db = this.client.db(this.database);
            const usersCount = await db.collection('users').countDocuments();
            return usersCount;
        } catch (err) {
            console.error('Error counting users:', err);
            return -1;
        }
    }

    async nbFiles() {
        try {
            const db = this.client.db(this.database);
            const filesCount = await db.collection('files').countDocuments();
            return filesCount;
        } catch (err) {
            console.error('Error counting files:', err);
            return -1;
        }
    }
}

const dbClient = new DBClient();
module.exports = dbClient;