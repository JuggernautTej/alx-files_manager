/*eslint-disable*/
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import { json } from 'express';

class AppController {
    // GET /status - Returns Redis and DB statuses
    static async getStatus(req, res) {
        const redisAlive = redisClient.isAlive();
        const dbAlive = dbClient.isAlive();

        res.status(200).json({ redis: redisAlive, db: dbAlive });
    }
    // GET /stats - Returns the count of users and files in the DB
    static async getStats(req, res) {
        try {
            const usersCount = await dbClient.nbUsers();
            const filesCount = await dbClient.nbFiles();
            res.status(200).json({ users: usersCount, files: filesCount });
        } catch (error) {
            res.status(500).json({ error: 'Could not retrieve stats' });
        }
    }
}

module.exports = AppController;