import { dbClient } from '../utils/db';
import crypto from 'crypto';

const sha1 = (input) => {
  return crypto.createHash('sha1').update(input).digest('hex');
};

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const existingUser = await dbClient.usersCollection().findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = sha1(password);

      const newUser = {
        email,
        password: hashedPassword,
      };

      const result = await dbClient.usersCollection().insertOne(newUser);

      return res.status(201).json({ id: result.insertedId, email: newUser.email });
    } catch (err) {
      console.error('Error creating user:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

export default UsersController;