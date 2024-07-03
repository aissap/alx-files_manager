import { createClient } from 'redis';

class RedisClient {
  constructor () {
    this.client = createClient();
    this.connected = false;

    this.client.on('error', (err) => {
      console.error(`Redis client error: ${err}`);
    });

    this.client.on('ready', () => {
      console.log('Redis client connected');
      this.connected = true;
    });
  }

  isAlive () {
    return this.connected;
  }

  async get (key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) return reject(err);
        resolve(value);
      });
    });
  }

  async set (key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err, reply) => {
        if (err) return reject(err);
        resolve(reply);
      });
    });
  }

  async del (key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, reply) => {
        if (err) return reject(err);
        resolve(reply);
      });
    });
  }
}

const redisClient = new RedisClient();
export default redisClient;
