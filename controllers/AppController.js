const { MongoClient } = require('mongodb');

const AppController = {
    async getStatus(req, res) {
        let redisStatus = false;
        let dbStatus = false;

        try {
            redisStatus = redisClient.isAlive();

            const client = new MongoClient(process.env.DB_HOST, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            await client.connect();
            const db = client.db(process.env.DB_DATABASE);
            dbStatus = !!db;

            client.close();
        } catch (err) {
            console.error('Error checking status:', err);
        }

        if (redisStatus && dbStatus) {
            res.status(200).json({ redis: true, db: true });
        } else {
            res.status(500).json({ redis: false, db: false });
        }
    },

};

module.exports = AppController;