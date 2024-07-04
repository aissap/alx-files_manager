const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const sha1 = require('sha1');
const mime = require('mime-types');
const { ObjectId } = require('mongodb');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const db = dbClient.client.db(dbClient.database);

    if (parentId !== 0) {
      const parent = await db.collection('files').findOne({ _id: new require('mongodb').ObjectID(parentId) });
      if (!parent) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parent.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId: new require('mongodb').ObjectID(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : new require('mongodb').ObjectID(parentId),
      localPath: null,
    };

    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const localPath = path.join(folderPath, uuidv4());
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
      fileData.localPath = localPath;
    }

    const result = await db.collection('files').insertOne(fileData);
    const newFile = result.ops[0];

    return res.status(201).json({
      id: newFile._id,
      userId: newFile.userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
      localPath: newFile.localPath,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const db = dbClient.client.db(dbClient.database);
    const file = await db.collection('files').findOne({
      _id: new require('mongodb').ObjectID(fileId),
      userId: new require('mongodb').ObjectID(userId),
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page) || 0;
    const db = dbClient.client.db(dbClient.database);

    const files = await db.collection('files').aggregate([
      {
        $match: {
          parentId: parentId === 0 ? 0 : new require('mongodb').ObjectID(parentId),
          userId: new require('mongodb').ObjectID(userId),
        },
      },
      { $skip: page * 20 },
      { $limit: 20 },
    ]).toArray();

    return res.json(files);
  }
  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
    const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
    return res.status(200).json(updatedFile);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
    const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
    return res.status(200).json(updatedFile);
  }
  static async getFile(req, res) {
    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!file.isPublic) {
        if (!userId || userId !== file.userId.toString()) return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });

    const filePath = file.localPath;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });

    const mimeType = mime.lookup(file.name);
    res.setHeader('Content-Type', mimeType);
    const fileContent = await promisify(fs.readFile)(filePath, 'utf8');
    return res.status(200).send(fileContent);
  }
}

module.exports = FilesController;