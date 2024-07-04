const Bull = require('bull');
const { getDB } = require('./utils/db');
const { ObjectId } = require('mongodb');

const userQueue = new Bull('userQueue');

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  const db = await getDB();
  const user = await db.collection('users').findOne({ _id: ObjectId(userId) });

  if (!user) {
    throw new Error('User not found');
  }
  console.log(`Welcome ${user.email}!`);
});