import dbClient from '../utils/db';

test('dbClient is connected', async () => {
  const isAlive = dbClient.isAlive();
  expect(isAlive).toBe(true);
});

test('dbClient returns the correct database', async () => {
  const db = dbClient.db();
  expect(db).toBeDefined();
});