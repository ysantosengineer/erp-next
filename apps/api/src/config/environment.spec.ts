import { validateEnvironment } from './environment';

const valid = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/erp_test',
  JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
  JWT_ACCESS_TTL_SECONDS: '900',
  JWT_REFRESH_TTL_SECONDS: '604800',
  CORS_ORIGINS: 'http://localhost:3000',
};

describe('validateEnvironment', () => {
  it('normaliza defaults seguros', () => {
    expect(validateEnvironment(valid)).toMatchObject({
      AUTH_COOKIE_SECURE: 'false',
      REQUEST_BODY_LIMIT: '256kb',
      SWAGGER_ENABLED: 'true',
    });
  });

  it.each([
    [{ JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET }, 'distintos'],
    [{ CORS_ORIGINS: '*' }, 'CORS_ORIGINS'],
    [{ REQUEST_BODY_LIMIT: '10mb' }, 'REQUEST_BODY_LIMIT'],
    [{ DATABASE_URL: 'mysql://localhost/database' }, 'PostgreSQL'],
  ])('rejeita configuração insegura %#', (override, message) => {
    expect(() => validateEnvironment({ ...valid, ...override })).toThrow(message);
  });

  it('exige cookie seguro em produção', () => {
    expect(() =>
      validateEnvironment({ ...valid, NODE_ENV: 'production', AUTH_COOKIE_SECURE: 'false' }),
    ).toThrow('AUTH_COOKIE_SECURE=true');
  });
});
