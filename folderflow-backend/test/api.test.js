const request = require('supertest');
const express = require('express');
const router = require('../routes');

const app = express();
app.use(express.json());
app.use('/', router);

describe('FolderFlow API', () => {
  it('should register a user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: 'testpass' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('should login a user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'testpass' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  // Add more tests for upload, download, payments, etc.
});
