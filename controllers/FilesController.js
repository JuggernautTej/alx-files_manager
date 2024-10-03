/*eslint-disable*/
import fs from 'fs';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

const Bull = require('bull');


class FilesController{
    static async postUpload (req, res) {
        const fileQueue = new Bull('fileQueue');
    
        const token = req.header('X-Token') || null;
        if (!token) return res.status(401).send({ error: 'Unauthorized' });
    
        const redisToken = await RedisClient.get(`auth_${token}`);
        if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });
    
        const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(redisToken) });
        if (!user) return res.status(401).send({ error: 'Unauthorized' });
    
        const fileName = req.body.name;
        if (!fileName) return res.status(400).send({ error: 'Missing name' });
    
        const fileType = req.body.type;
        if (!fileType || !['folder', 'file', 'image'].includes(fileType)) return res.status(400).send({ error: 'Missing type' });
    
        const fileData = req.body.data;
        if (!fileData && ['file', 'image'].includes(fileType)) return res.status(400).send({ error: 'Missing data' });
    
        const fileIsPublic = req.body.isPublic || false;
        let fileParentId = req.body.parentId || 0;
        fileParentId = fileParentId === '0' ? 0 : fileParentId;
        if (fileParentId !== 0) {
          const parentFile = await DBClient.db.collection('files').findOne({ _id: ObjectId(fileParentId) });
          if (!parentFile) return res.status(400).send({ error: 'Parent not found' });
          if (!['folder'].includes(parentFile.type)) return res.status(400).send({ error: 'Parent is not a folder' });
        }
    
        const fileDataDb = {
          userId: user._id,
          name: fileName,
          type: fileType,
          isPublic: fileIsPublic,
          parentId: fileParentId
        };
    
        if (['folder'].includes(fileType)) {
          await DBClient.db.collection('files').insertOne(fileDataDb);
          return res.status(201).send({
            id: fileDataDb._id,
            userId: fileDataDb.userId,
            name: fileDataDb.name,
            type: fileDataDb.type,
            isPublic: fileDataDb.isPublic,
            parentId: fileDataDb.parentId
          });
        }
    
        const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';
        const fileUuid = uuidv4();
    
        const buff = Buffer.from(fileData, 'base64');
        const pathFile = `${pathDir}/${fileUuid}`;
    
        await fs.mkdir(pathDir, { recursive: true }, (error) => {
          if (error) return res.status(400).send({ error: error.message });
          return true;
        });
    
        await fs.writeFile(pathFile, buff, (error) => {
          if (error) return res.status(400).send({ error: error.message });
          return true;
        });
    
        fileDataDb.localPath = pathFile;
        await DBClient.db.collection('files').insertOne(fileDataDb);
    
        fileQueue.add({
          userId: fileDataDb.userId,
          fileId: fileDataDb._id
        });
    
        return response.status(201).send({
          id: fileDataDb._id,
          userId: fileDataDb.userId,
          name: fileDataDb.name,
          type: fileDataDb.type,
          isPublic: fileDataDb.isPublic,
          parentId: fileDataDb.parentId
        });
      }

    static async getShow(req, res) {
        const token = req.header('X-Token');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const key = `auth_${token}`;
        const userId = await RedisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const fileId = req.params.id;
        try {
            const file = await DBClient.db.collection('files').findOne({
                _id: ObjectId(fileId),
                userId: ObjectId(userId),
            });
            if (!file) {
                return res.status(404).json({ error: 'Not found' });
            }
            return res.send({
                id: file._id,
                userId: file.userId,
                name: file.name,
                type: file.type,
                isPublic: file.isPublic,
                parentId: file.parentId
            });
        } catch (error) {
            return res.status(404).json({ error: 'Not found' });
        }
    }

    static async getIndex(req, res) {
        const token = req.header('X-Token');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const key = `auth_${token}`;
        const userId = await RedisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { parentId = '0', page = 0 } = req.query;
        // const pageSize = 20;
        // const skip = pageSize * parseInt(page, 10);
        const aggregationMatch = { $and: [{ parentId }] };
        let aggregateData = [{ $match: aggregationMatch }, { $skip: pagination * 20 }, { $limit: 20 }];
        if (parentId === 0) aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

        const files = await DBClient.db.collection('files').aggregate(aggregateData);
        const filesArray = [];
        await files.forEach((item) => {
            const fileItem = {
                id: item._id,
                userId: item.userId,
                name: item.name,
                type: item.type,
                isPublic: item.isPublic,
                parentId: item.parentId
          };
          filesArray.push(fileItem);
        });

        return response.send(filesArray);
    }

    static async putPublish (request, response) {
        const token = request.header('X-Token') || null;
        if (!token) return response.status(401).send({ error: 'Unauthorized' });
    
        const redisToken = await RedisClient.get(`auth_${token}`);
        if (!redisToken) return response.status(401).send({ error: 'Unauthorized' });
    
        const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(redisToken) });
        if (!user) return response.status(401).send({ error: 'Unauthorized' });
    
        const idFile = request.params.id || '';
    
        let fileDocument = await DBClient.db.collection('files').findOne({ _id: ObjectId(idFile), userId: user._id });
        if (!fileDocument) return response.status(404).send({ error: 'Not found' });
    
        await DBClient.db.collection('files').update({ _id: ObjectId(idFile) }, { $set: { isPublic: true } });
        fileDocument = await DBClient.db.collection('files').findOne({ _id: ObjectId(idFile), userId: user._id });
    
        return response.send({
            id: fileDocument._id,
            userId: fileDocument.userId,
            name: fileDocument.name,
            type: fileDocument.type,
            isPublic: fileDocument.isPublic,
            parentId: fileDocument.parentId
        });
      }
    
    static async putUnpublish (request, response) {
        const token = request.header('X-Token') || null;
        if (!token) return response.status(401).send({ error: 'Unauthorized' });
    
        const redisToken = await RedisClient.get(`auth_${token}`);
        if (!redisToken) return response.status(401).send({ error: 'Unauthorized' });
    
        const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(redisToken) });
        if (!user) return response.status(401).send({ error: 'Unauthorized' });
    
        const idFile = request.params.id || '';
    
        let fileDocument = await DBClient.db.collection('files').findOne({ _id: ObjectId(idFile), userId: user._id });
        if (!fileDocument) return response.status(404).send({ error: 'Not found' });
    
        await DBClient.db.collection('files').update({ _id: ObjectId(idFile), userId: user._id }, { $set: { isPublic: false } });
        fileDocument = await DBClient.db.collection('files').findOne({ _id: ObjectId(idFile), userId: user._id });
    
        return response.send({
            id: fileDocument._id,
            userId: fileDocument.userId,
            name: fileDocument.name,
            type: fileDocument.type,
            isPublic: fileDocument.isPublic,
            parentId: fileDocument.parentId
        });
      }
}
module.exports = FilesController;