import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

export async function createTenant(prisma: PrismaClient, permissions: string[] = []) {
  const suffix = randomUUID().slice(0, 8);
  const company = await prisma.company.create({ data: { name: `Tenant ${suffix}` } });
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name: `User ${suffix}`,
      email: `user-${suffix}@e2e.local`,
      passwordHash: await bcrypt.hash('E2e-password-123!', 4),
    },
  });
  const role = await prisma.role.create({
    data: { companyId: company.id, name: `Role ${suffix}` },
  });
  for (const code of permissions) {
    const split = code.lastIndexOf('.');
    const resource = code.slice(0, split);
    const action = code.slice(split + 1);
    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action },
    });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  }
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return { company, user, role, password: 'E2e-password-123!' };
}
