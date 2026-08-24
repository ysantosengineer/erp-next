const booleanValues = new Set(['true', 'false']);

export function validateEnvironment(input: Record<string, unknown>): Record<string, unknown> {
  const config = { ...input };
  const nodeEnv = String(config.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv))
    throw new Error('NODE_ENV inválido.');
  config.NODE_ENV = nodeEnv;
  for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const value = String(config[key] ?? '');
    if (!value) throw new Error(`${key} é obrigatório.`);
    config[key] = value;
  }
  if (!String(config.DATABASE_URL).startsWith('postgresql://'))
    throw new Error('DATABASE_URL deve usar PostgreSQL.');
  const access = String(config.JWT_ACCESS_SECRET);
  const refresh = String(config.JWT_REFRESH_SECRET);
  if (
    access.length < 32 ||
    refresh.length < 32 ||
    access.startsWith('replace_') ||
    refresh.startsWith('replace_')
  )
    throw new Error('Segredos JWT devem ser distintos, seguros e possuir ao menos 32 caracteres.');
  if (access === refresh)
    throw new Error('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET devem ser distintos.');
  const origins = String(config.CORS_ORIGINS ?? config.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (
    !origins.length ||
    origins.includes('*') ||
    origins.some((origin) => {
      try {
        return !['http:', 'https:'].includes(new URL(origin).protocol);
      } catch {
        return true;
      }
    })
  )
    throw new Error('CORS_ORIGINS contém uma origem inválida.');
  config.CORS_ORIGINS = origins.join(',');
  config.JWT_ISSUER = String(config.JWT_ISSUER ?? 'erp-next-api');
  config.JWT_AUDIENCE = String(config.JWT_AUDIENCE ?? 'erp-next-web');
  const bodyLimit = String(config.REQUEST_BODY_LIMIT ?? '256kb').toLowerCase();
  const bodyLimitMatch = /^(\d{1,4})(kb|mb)$/.exec(bodyLimit);
  if (
    !bodyLimitMatch ||
    Number(bodyLimitMatch[1]) <= 0 ||
    (bodyLimitMatch[2] === 'kb' && Number(bodyLimitMatch[1]) > 1024) ||
    (bodyLimitMatch[2] === 'mb' && Number(bodyLimitMatch[1]) > 1)
  ) {
    throw new Error('REQUEST_BODY_LIMIT deve estar entre 1kb e 1mb.');
  }
  config.REQUEST_BODY_LIMIT = bodyLimit;
  for (const key of ['AUTH_COOKIE_SECURE', 'SWAGGER_ENABLED'] as const) {
    const fallback =
      key === 'AUTH_COOKIE_SECURE' ? 'false' : nodeEnv === 'production' ? 'false' : 'true';
    const value = String(config[key] ?? fallback);
    if (!booleanValues.has(value)) throw new Error(`${key} deve ser true ou false.`);
    config[key] = value;
  }
  if (nodeEnv === 'production' && config.AUTH_COOKIE_SECURE !== 'true')
    throw new Error('AUTH_COOKIE_SECURE=true é obrigatório em produção.');
  for (const key of ['JWT_ACCESS_TTL_SECONDS', 'JWT_REFRESH_TTL_SECONDS'] as const) {
    const value = Number(config[key]);
    if (!Number.isInteger(value) || value <= 0)
      throw new Error(`${key} deve ser inteiro positivo.`);
  }
  return config;
}

export function corsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
