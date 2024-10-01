/*eslint-disable*/
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import { Buffer } from 'buffer';

class AuthController{
    // Connect (sign-in)
    static async getConnect(req, res) {
        const authorization = req.header('Authorization') || '';
        const encodedCredentials = authorization.split(' ')[1];
        if (!encodedCredentials) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
        const [email, password] = decodedCredentials.split(':');
        if (!email || !password) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hashedPasswd = sha1(password);
        const user = await dbClient.db.collection('users').findOne({ email, password: hashedPasswd });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = uuidv4();
        const key = `auth_${token}`;
        await redisClient.set(key, String(user._id), 86400);
        return res.status(200).json({ "token": token });
    }

    static async getDisconnect(req, res) {
        const token = req.header('X-Token');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const key = `auth_${token}`;
        const user = await redisClient.get(key);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        await redisClient.del(key);
        return res.status(204).send();
    }
}

module.exports = AuthController;