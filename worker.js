import Bull from 'bull';
import dbClient from './utils/db';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import path from 'path';

const fileQueue = new Bull('fileQueue');
const userQueue = new Bull('userQueue');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    done(new Error('Missing fileId'));
    return;
  }

  if (!userId) {
    done(new Error('Missing userId'));
    return;
  }

  const db = dbClient.db();
  const filesCollection = db.collection('files');
  const file = await filesCollection.findOne({ _id: dbClient.getObjectId(fileId), userId });

  if (!file) {
    done(new Error('File not found'));
    return;
  }

  const options = { responseType: 'base64' };
  const sizes = [100, 250, 500];

  for (const size of sizes) {
    const thumbnail = await imageThumbnail(file.localPath, { width: size });
    const thumbPath = `${file.localPath}_${size}`;
    fs.writeFileSync(thumbPath, Buffer.from(thumbnail, 'base64'));
  }

  done();
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) {
    done(new Error('Missing userId'));
    return;
  }

  const db = dbClient.db();
  const usersCollection = db.collection('users');
  const user = await usersCollection.findOne({ _id: dbClient.getObjectId(userId) });

  if (!user) {
    done(new Error('User not found'));
    return;
  }

  console.log(`Welcome ${user.email}!`);
  
  done();
});

export { fileQueue, userQueue };