/*eslint-disable*/
import fs from 'fs';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';


class FilesController{
    static async postUpload(req, res) {
        const token = req.header('X-Token');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const key = `auth_${token}`;
        const user = await redisClient.get(key);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { name, type, parentId = 0, isPublic = false, data } = req.body;
        // Validate name
        if (!name) {
            return res.status(400).json({ error: 'Missing name' });
        }
        // Validate type
        const validTypes = ['folder', 'file', 'image'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Missing type or invalid type' });
        }
        // Validate data if type is file or image
        if (type !== 'folder' && !data) {
            return res.status(400),json({ error: 'Missing data' });
        }
        // CHeck if parentId is valid
        let parentFile = null;
        if (parentId !== 0) {
            try {
                parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
                if (!parentFile) {
                    return res.status(400).json({ error: 'Parent not found' });
                }
                if (parentFile.type !== 'folder') {
                    return res.status(400).json({ error: 'Parent is not a folder' });
                }
            } catch (error) {
                return res.status(400).json({ error: 'Invalid parentId' });
            }
        }
        const userObjectId = ObjectId(user);
        // If it's a folder, save in the database
        if (type === 'folder') {
            const folderData = {
                userId: userObjectId,
                name,
                type,
                isPublic,
                parentId: parentId === 0 ? '0' : ObjectId(parentId),
            };
            const result = await dbClient.db.collection('files').insertOne(folderData);
            return res.status(201).json({
                id: result.insertedId,
                user,
                name,
                type,
                isPublic,
                parentId,
            });
        }
        // If it's a file or image, save it on the disk
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const fileName = uuidv4();
        const localPath = `${folderPath}/${fileName}`;
        try {
            // Save the file to disk
            const fileData = Buffer.from(data, 'base64');
            fs.writeFileSync(localPath, fileData);
        } catch (error) {
            return res.status(500).json({ error: 'Error saving the file' });
        }
        // Save the file metadata in the database
        const fileDocument = {
            userId: userObjectId,
            name,
            type,
            isPublic,
            parentId: parentId === 0 ? '0' : ObjectId(parentId),
            localPath,
        };
        const result = await dbClient.db.collection('files').insertOne(fileDocument);
        return res.status(201).json({
            id: result.insertedId,
            userId: user,
            name,
            type,
            isPublic,
            parentId,
        });
    }

    static async getShow(req, res) {
        const token = req.header('X-Token');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const key = `auth_${token}`;
        const userId = await redisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const fileId = req.params.id;
        try {
            const file = await dbClient.db.collection('files').findOne({
                _id: ObjectId(fileId),
                userId: ObjectId(userId),
            });
            if (!file) {
                return res.status(404).json({ error: 'Not found' });
            }
            return res.status(200).json(file);
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
        const userId = await redisClient.get(key);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { parentId = '0', page = 0 } = req.query;
        const pageSize = 20;
        const skip = pageSize * parseInt(page, 10);
        let filter = { userId: ObjectId(userId) };
        if (parentId !== '0') {
            filter.parentId = ObjectId(parentId);
        }
        try {
            const files = await dbClient.db.collection('files')
            .find(filter)
            .skip(skip)
            .limit(pageSize)
            .toArray();
            return res.status(200).json(files);
        } catch (error) {
            return res.status(500).json({ error: 'Error retrieving files' });
        }
    }
}
module.exports = FilesController;