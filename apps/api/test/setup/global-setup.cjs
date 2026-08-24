const { PrismaClient } = require('@prisma/client');
const { execFileSync } = require('node:child_process');

module.exports = async () => {
  const target = process.env.DATABASE_URL_TEST;
  if (!target) throw new Error('DATABASE_URL_TEST é obrigatória.');
  const parsed = new URL(target);
  const database = parsed.pathname.replace(/^\//, '');
  const schema = parsed.searchParams.get('schema') || 'public';
  const isolatedDatabase = database.endsWith('_test') && /^[a-zA-Z0-9_]+$/.test(database);
  const isolatedSchema = schema.endsWith('_test') && /^[a-zA-Z0-9_]+$/.test(schema);
  if (!isolatedDatabase && !isolatedSchema) throw new Error('Destino E2E inseguro.');
  if (isolatedDatabase) {
    const admin = new URL(target);
    admin.pathname = '/postgres';
    admin.search = '';
    const prisma = new PrismaClient({ datasourceUrl: admin.toString() });
    try {
      await prisma.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    } catch (error) {
      if (error?.meta?.code !== '42P04') throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: target },
    stdio: 'inherit',
  });
};
