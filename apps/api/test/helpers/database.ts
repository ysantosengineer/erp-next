import { PrismaService } from '../../src/prisma/prisma.service';

export async function resetTestDatabase(prisma: PrismaService): Promise<void> {
  const target = new URL(process.env.DATABASE_URL!);
  const database = target.pathname.replace(/^\//, '');
  const schema = target.searchParams.get('schema') ?? 'public';
  if (!database.endsWith('_test') && !schema.endsWith('_test'))
    throw new Error('Reset bloqueado fora do destino E2E.');
  const tables = await prisma.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    const quoted = tables.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  }
}
