const { expect } = require('chai');
const redisClient = require('../utils/redis');

describe('Redis Client Tests', () => {
  it('should set and get a value from Redis', async () => {
    await redisClient.set('testKey', 'testValue');
    const value = await redisClient.get('testKey');
    expect(value).to.equal('testValue');
  });
});