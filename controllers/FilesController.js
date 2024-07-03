import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import { fileQueue } from '../worker';
import mime from 'mime-types';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  async postUpload(req, res) {
    try {
      const { name, type, parentId = 0, isPublic = false, data } = req.body;
      const userId = req.userId;

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing or invalid type' });
      }
      if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      const db = dbClient.db();
      const filesCollection = db.collection('files');

      if (parentId !== 0) {
        const parentFile = await filesCollection.findOne({ _id: dbClient.getObjectId(parentId) });
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      let localPath = null;
      if (type !== 'folder') {
        const fileData = Buffer.from(data, 'base64');
        const fileId = uuidv4();
        localPath = path.join(FOLDER_PATH, fileId);
        fs.writeFileSync(localPath, fileData);
      }

      const newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId,
        localPath,
      };

      const result = await filesCollection.insertOne(newFile);
      const insertedId = result.insertedId;

      if (type === 'image') {
        fileQueue.add({ userId, fileId: insertedId.toString() });
      }

      return res.status(201).json({ id: insertedId.toString(), ...newFile });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getShow(req, res) {
    try {
      const fileId = req.params.id;
      const userId = req.userId;

      const db = dbClient.db();
      const filesCollection = db.collection('files');

      const file = await filesCollection.findOne({ _id: dbClient.getObjectId(fileId), userId });

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      return res.status(200).json(file);
    } catch (error) {
      console.error('Error fetching file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getIndex(req, res) {
    try {
      const userId = req.userId;
      const { parentId = 0, page = 0 } = req.query;

      const db = dbClient.db();
      const filesCollection = db.collection('files');

      const skip = parseInt(page) * 20;
      const query = { userId, parentId };

      const files = await filesCollection.find(query).skip(skip).limit(20).toArray();

      return res.status(200).json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async putPublish(req, res) {
    try {
      const fileId = req.params.id;
      const userId = req.userId;

      const db = dbClient.db();
      const filesCollection = db.collection('files');

      const updatedFile = await filesCollection.findOneAndUpdate(
        { _id: dbClient.getObjectId(fileId), userId },
        { $set: { isPublic: true } },
        { returnOriginal: false }
      );

      if (!updatedFile.value) {
        return res.status(404).json({ error: 'File not found' });
      }

      return res.status(200).json(updatedFile.value);
    } catch (error) {
      console.error('Error publishing file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async putUnpublish(req, res) {
    try {
      const fileId = req.params.id;
      const userId = req.userId;

      const db = dbClient.db();
      const filesCollection = db.collection('files');

      const updatedFile = await filesCollection.findOneAndUpdate(
        { _id: dbClient.getObjectId(fileId), userId },
        { $set: { isPublic: false } },
        { returnOriginal: false }
      );

      if (!updatedFile.value) {
        return res.status(404).json({ error: 'File not found' });
      }

      return res.status(200).json(updatedFile.value);
    } catch (error) {
      console.error('Error unpublishing file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getFile(req, res) {
    try {
      const fileId = req.params.id;
      const size = req.query.size || null;
      const userId = req.userId;

      const db = dbClient.db();
      const filesCollection = db.collection('files');

      const file = await filesCollection.findOne({ _id: dbClient.getObjectId(fileId) });

      if (!file || (file.isPublic === false && file.userId !== userId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      let filePath = file.localPath;
      if (size && ['100', '250', '500'].includes(size)) {
        filePath = `${filePath}_${size}`;
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name);
      res.setHeader('Content-Type', mimeType);
      return res.status(200).sendFile(filePath);
    } catch (error) {
      console.error('Error fetching file data:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

export default FilesController;