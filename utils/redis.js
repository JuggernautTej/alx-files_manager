/*eslint-disable*/
import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
    constructor() {
        this.client = redis.createClient();
        this.connected = false;
        this.client.on('error', (err) => {
            console.error(`Redis client not connected to the server: ${err.message}`);
        });
        this.client.on('ready', () => {
            this.connected = true;
        });
        this.getAsync = promisify(this.client.get).bind(this.client);
        this.setAsync = promisify(this.client.set).bind(this.client);
        this.delAsync = promisify(this.client.del).bind(this.client);
    }
    isAlive() {
        return this.connected;
    }
    async get(key) {
        try {
            const value = await this.getAsync(key);
            return value;
        } catch (error) {
            console.error(`Error getting key ${key}: ${error}`);
            return null;
        }
    }

    async set(key, value, duration) {
        try {
            await this.setAsync(key, value, 'EX', duration);
            // console.log(`Key ${key} set for ${duration} seconds`);
        } catch (error) {
            console.error(`Error setting key ${key}: ${error}`);
        }
    }

    async del(key) {
        try {
            await this.delAsync(key);
            console.log(`Key ${key} deleted`);
        } catch (error) {
            console.error(`Error deleting ${key}: ${error}`);
        }
    }
}

const redisClient = new RedisClient();
module.exports = redisClient;