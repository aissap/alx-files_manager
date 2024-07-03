import redisClient from '../utils/redis';

test('redisClient is connected', async () => {
  const isAlive = redisClient.isAlive();
  expect(isAlive).toBe(true);
});