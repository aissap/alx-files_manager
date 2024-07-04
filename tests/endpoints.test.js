const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('Status Endpoint Tests', () => {
  it('should return status 200', (done) => {
    request(app)
      .get('/status')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.status).to.equal('OK');
        done();
      });
  });
});