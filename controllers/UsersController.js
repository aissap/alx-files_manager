import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { userQueue } from '../worker';

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const db = dbClient.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const userId = uuidv4();
    const newUser = { email, password: hashedPassword, _id: userId };

    await usersCollection.insertOne(newUser);

    userQueue.add({ userId });

    return res.status(201).json({ id: userId, email });
  },
};