import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.company.upsert({
    where: { document: '00000000000000' },
    update: {},
    create: {
      name: 'ERP Next Local',
      document: '00000000000000',
    },
  });

  const permissions = await Promise.all(
    [
      {
        resource: 'access',
        action: 'manage',
        description: 'Administra usuários e acessos.',
      },
      {
        resource: 'roles',
        action: 'manage',
        description: 'Administra papéis e permissões.',
      },
    ].map((permission) =>
      prisma.permission.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action,
          },
        },
        update: { description: permission.description },
        create: permission,
      }),
    ),
  );

  const administratorRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: { description: 'Papel administrativo local.', isSystem: true },
    create: {
      name: 'Administrator',
      description: 'Papel administrativo local.',
      isSystem: true,
    },
  });

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: administratorRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: administratorRole.id, permissionId: permission.id },
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
