// Supertest expõe `export =`; o Jest E2E CommonJS não fornece um default em runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import type { INestApplication } from '@nestjs/common';

export async function login(app: INestApplication, email: string, password: string) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  const cookie = response.headers['set-cookie'];
  return {
    accessToken: response.body.accessToken as string,
    cookie: Array.isArray(cookie) ? cookie[0] : cookie,
  };
}
export function authorized(app: INestApplication, token: string) {
  return request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${token}`);
}
