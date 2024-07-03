import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const uri = `mongodb://${host}:${port}/${database}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    this.db = null;

    this.client.connect((err) => {
      if (err) {
        console.error(`MongoDB connection error: ${err}`);
      } else {
        console.log('MongoDB connected');
        this.db = this.client.db(database);
        this.createCollections();
      }
    });
  }

  async createCollections() {
    try {
      await this.db.createCollection('users');
      await this.db.createCollection('files');
      console.log('Collections created');
    } catch (error) {
      if (error.codeName === 'NamespaceExists') {
        console.log('Collections already exist');
      } else {
        console.error(`Error creating collections: ${error}`);
      }
    }
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    if (!this.isAlive()) throw new Error('DB not connected');
    const count = await this.db.collection('users').countDocuments();
    return count;
  }

  async nbFiles() {
    if (!this.isAlive()) throw new Error('DB not connected');
    const count = await this.db.collection('files').countDocuments();
    return count;
  }

  async getUser(query) {
    if (!this.isAlive()) throw new Error('DB not connected');
    const user = await this.db.collection('users').findOne(query);
    return user;
  }
}

const dbClient = new DBClient();
export default dbClient;