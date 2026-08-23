import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword || seedPassword.length < 12 || seedPassword.startsWith('replace_')) {
    throw new Error(
      'Defina SEED_ADMIN_PASSWORD com ao menos 12 caracteres antes de executar o seed.',
    );
  }
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@erp.local').trim().toLowerCase();
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const company = await prisma.company.upsert({
    where: { document: '00000000000000' },
    update: { isActive: true },
    create: { name: 'ERP Next Local', document: '00000000000000' },
  });

  const permissionCatalog = [
    ['users', 'read', 'Consulta usuários.'],
    ['users', 'create', 'Cria usuários.'],
    ['users', 'update', 'Atualiza usuários.'],
    ['users', 'manage_status', 'Ativa e inativa usuários.'],
    ['users', 'manage_roles', 'Gerencia papéis de usuários.'],
    ['roles', 'read', 'Consulta papéis.'],
    ['roles', 'create', 'Cria papéis.'],
    ['roles', 'update', 'Atualiza papéis.'],
    ['roles', 'delete', 'Exclui papéis sem vínculos.'],
    ['roles', 'manage_permissions', 'Gerencia permissões dos papéis.'],
  ] as const;
  const permissions = await Promise.all(
    permissionCatalog.map(([resource, action, description]) =>
      prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: { description },
        create: { resource, action, description },
      }),
    ),
  );
  const businessPermissions = [
    ['categories', 'read', 'Consulta categorias.'],
    ['categories', 'create', 'Cria categorias.'],
    ['categories', 'update', 'Atualiza categorias.'],
    ['categories', 'manage_status', 'Ativa e inativa categorias.'],
    ['units', 'read', 'Consulta unidades de medida.'],
    ['units', 'create', 'Cria unidades de medida.'],
    ['units', 'update', 'Atualiza unidades de medida.'],
    ['units', 'manage_status', 'Ativa e inativa unidades de medida.'],
    ['suppliers', 'read', 'Consulta fornecedores.'],
    ['suppliers', 'create', 'Cria fornecedores.'],
    ['suppliers', 'update', 'Atualiza fornecedores.'],
    ['suppliers', 'manage_status', 'Ativa e inativa fornecedores.'],
    ['products', 'read', 'Consulta produtos.'],
    ['products', 'create', 'Cria produtos.'],
    ['products', 'update', 'Atualiza produtos.'],
    ['products', 'manage_status', 'Ativa e inativa produtos.'],
    ['customers', 'read', 'Consulta clientes.'],
    ['customers', 'create', 'Cria clientes.'],
    ['customers', 'update', 'Atualiza clientes.'],
    ['customers', 'manage_status', 'Ativa e inativa clientes.'],
    ['warehouses', 'read', 'Consulta depósitos.'],
    ['warehouses', 'create', 'Cria depósitos.'],
    ['warehouses', 'update', 'Atualiza depósitos.'],
    ['warehouses', 'manage_status', 'Ativa e inativa depósitos.'],
    ['stock_locations', 'read', 'Consulta endereços de estoque.'],
    ['stock_locations', 'create', 'Cria endereços de estoque.'],
    ['stock_locations', 'update', 'Atualiza endereços de estoque.'],
    ['stock_locations', 'manage_status', 'Ativa e inativa endereços de estoque.'],
    ['inventory', 'read', 'Consulta saldos de estoque.'],
    ['inventory', 'entry', 'Registra entradas de estoque.'],
    ['inventory', 'exit', 'Registra saídas de estoque.'],
    ['inventory', 'adjust', 'Registra ajustes de estoque.'],
    ['inventory', 'transfer', 'Transfere estoque entre endereços.'],
    ['inventory.movements', 'read', 'Consulta o histórico de movimentações.'],
    ['inventory_counts', 'read', 'Consulta inventários físicos.'],
    ['inventory_counts', 'create', 'Cria e inicia inventários físicos.'],
    ['inventory_counts', 'count', 'Registra a primeira contagem física.'],
    ['inventory_counts', 'recount', 'Solicita e registra recontagens.'],
    ['inventory_counts', 'approve', 'Aprova inventários e gera ajustes.'],
    ['inventory_counts', 'cancel', 'Cancela inventários físicos.'],
  ] as const;
  const newPermissions = await Promise.all(
    businessPermissions.map(([resource, action, description]) =>
      prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: { description },
        create: { resource, action, description },
      }),
    ),
  );

  const administratorRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Administrator' } },
    update: { description: 'Papel administrativo local.', isSystem: true },
    create: {
      companyId: company.id,
      name: 'Administrator',
      description: 'Papel administrativo local.',
      isSystem: true,
    },
  });
  const administrator = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      companyId: company.id,
      name: 'Local Administrator',
      passwordHash,
      isActive: true,
    },
    create: {
      companyId: company.id,
      name: 'Local Administrator',
      email: adminEmail,
      passwordHash,
    },
  });

  await Promise.all(
    [...permissions, ...newPermissions].map((permission) =>
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
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: administrator.id, roleId: administratorRole.id } },
    update: {},
    create: { userId: administrator.id, roleId: administratorRole.id },
  });

  const standardUnits = [
    ['Unidade', 'UN'],
    ['Quilograma', 'KG'],
    ['Grama', 'G'],
    ['Litro', 'L'],
    ['Mililitro', 'ML'],
    ['Metro', 'M'],
    ['Caixa', 'CX'],
    ['Pacote', 'PCT'],
  ] as const;
  await Promise.all(
    standardUnits.map(([name, symbol]) =>
      prisma.unitOfMeasure.upsert({
        where: { companyId_normalizedSymbol: { companyId: company.id, normalizedSymbol: symbol } },
        update: { name, normalizedName: name.toLocaleLowerCase('pt-BR'), symbol, isActive: true },
        create: {
          companyId: company.id,
          name,
          normalizedName: name.toLocaleLowerCase('pt-BR'),
          symbol,
          normalizedSymbol: symbol,
        },
      }),
    ),
  );

  const mainWarehouse = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'MAIN' } },
    update: { name: 'Depósito Principal', isActive: true },
    create: {
      companyId: company.id,
      name: 'Depósito Principal',
      code: 'MAIN',
      description: 'Depósito padrão do ambiente local.',
    },
  });
  await prisma.stockLocation.upsert({
    where: { warehouseId_code: { warehouseId: mainWarehouse.id, code: 'DEFAULT' } },
    update: { companyId: company.id, isActive: true },
    create: {
      companyId: company.id,
      warehouseId: mainWarehouse.id,
      code: 'DEFAULT',
      description: 'Endereço padrão do ambiente local.',
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
