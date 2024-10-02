/*eslint-disable*/
import crypto from 'crypto';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class UsersController {
    static async postNew(req, res) {
        const data = req.body;
        
        const email = data.email;
        const password = data.password;

        // Check if email is missing
        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }
        // Check if password is missing
        if (!password) {
            return res.status(400).json({ error: 'Missing password'});
        }
        // Check if email already exists in the database
        const userExists = await dbClient.db.collection('users').findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'Already exist'});
        }

        // Hash the password using SHA1
        const hashedPasswd = crypto.createHash('sha1').update(password).digest('hex');
        // Insert the new user ito the users collection
        const newUser = {
            email,
            password: hashedPasswd,
        };
        try {
            const result = await dbClient.db.collection('users').insertOne(newUser);
            return res.status(201).json({ id: result.insertedId, email });
        } catch (err) {
            return res.status(500).json({ error: 'Error inserting user' });
        }
    }

    static async getMe(req, res) {
        const token = req.header('X-Token');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await dbClient.db.collection('users').findOne({ _id: dbClient.ObjectId(userId) });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.status(200).json({ id: user._id, email: user.email });
    }
}

module.exports = UsersController;