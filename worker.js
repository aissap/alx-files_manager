const Bull = require('bull');
const fs = require('fs');
const imageThumbnail = require('image-thumbnail');
const { getDB } = require('./utils/db');
const { ObjectId } = require('mongodb');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const db = await getDB();
  const file = await db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  const filePath = file.localPath;

  try {
    for (const size of sizes) {
      const thumbnail = await imageThumbnail(filePath, { width: size });
      fs.writeFileSync(`${filePath}_${size}`, thumbnail);
    }
  } catch (error) {
    throw new Error(`Error generating thumbnails: ${error.message}`);
  }
});

module.exports = fileQueue;