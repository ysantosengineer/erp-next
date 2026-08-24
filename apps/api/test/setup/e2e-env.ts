const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl) throw new Error('DATABASE_URL_TEST é obrigatória.');
const parsedDatabase = new URL(databaseUrl);
const isolatedTarget =
  parsedDatabase.pathname.replace(/^\//, '').endsWith('_test') ||
  (parsedDatabase.searchParams.get('schema') ?? '').endsWith('_test');
if (!isolatedTarget)
  throw new Error('DATABASE_URL_TEST deve apontar para banco ou schema dedicado com sufixo _test.');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_only_for_e2e_32_chars_minimum';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_only_for_e2e_32_chars_minimum';
process.env.JWT_ACCESS_TTL_SECONDS ??= '900';
process.env.JWT_REFRESH_TTL_SECONDS ??= '604800';
process.env.JWT_ISSUER ??= 'erp-next-api-e2e';
process.env.JWT_AUDIENCE ??= 'erp-next-web-e2e';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
process.env.AUTH_COOKIE_SECURE = 'false';
process.env.SWAGGER_ENABLED = 'false';
