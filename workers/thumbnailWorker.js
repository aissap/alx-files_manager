import Bull from 'bull';
import dbClient from '../utils/db';
import imageThumbnail from 'image-thumbnail';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async job => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const db = dbClient.db();
  const filesCollection = db.collection('files');

  const file = await filesCollection.findOne({ _id: dbClient.getObjectId(fileId), userId });

  if (!file) {
    throw new Error('File not found');
  }

  if (file.type !== 'image' || !file.localPath) {
    throw new Error('File is not an image or localPath is missing');
  }

  try {
    const dirName = path.dirname(file.localPath);
    const extName = path.extname(file.localPath);
    const baseName = path.basename(file.localPath, extName);

    const sizes = [500, 250, 100];
    const promises = sizes.map(async size => {
      const thumbnailPath = path.join(dirName, `${baseName}_${size}${extName}`);
      const thumbnail = await imageThumbnail(file.localPath, { width: size });
      fs.writeFileSync(thumbnailPath, thumbnail);

      return thumbnailPath;
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    throw new Error('Thumbnail generation failed');
  }
});
