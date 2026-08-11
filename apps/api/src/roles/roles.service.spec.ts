import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  const identity: AuthenticatedUser = {
    userId: '10000000-0000-4000-8000-000000000001',
    companyId: '20000000-0000-4000-8000-000000000001',
    companyName: 'Empresa de teste',
    name: 'Admin',
    email: 'admin@erp.local',
    authVersion: 1,
    roles: ['Administrator'],
    permissions: ['roles.read', 'roles.create', 'roles.manage_permissions'],
  };
  const permission = {
    id: '30000000-0000-4000-8000-000000000001',
    resource: 'users',
    action: 'read',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const role = {
    id: '40000000-0000-4000-8000-000000000001',
    companyId: identity.companyId,
    name: 'Operator',
    description: null,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    permissions: [],
  };
  const tx = {
    userRole: { findMany: jest.fn() },
    rolePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
    user: { updateMany: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
    role: { findUniqueOrThrow: jest.fn() },
  };
  const prisma = {
    role: { findFirst: jest.fn() },
    permission: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new RolesService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.role.findFirst.mockResolvedValue(role);
    prisma.permission.findMany.mockResolvedValue([permission]);
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );
    tx.userRole.findMany.mockResolvedValue([{ userId: identity.userId }]);
    tx.role.findUniqueOrThrow.mockResolvedValue({
      ...role,
      permissions: [
        { roleId: role.id, permissionId: permission.id, createdAt: new Date(), permission },
      ],
    });
  });

  it('bloqueia permissões na criação sem roles.manage_permissions', async () => {
    await expect(
      service.create(
        { ...identity, permissions: ['roles.create'] },
        { name: 'Operator', permissionIds: [permission.id] },
        'request-permission-escalation',
      ),
    ).rejects.toEqual(expect.any(ForbiddenException));
    expect(prisma.permission.findMany).not.toHaveBeenCalled();
  });

  it('substitui permissões e invalida sessões dos usuários afetados', async () => {
    const result = await service.replacePermissions(
      identity,
      role.id,
      [permission.id],
      'request-1',
    );

    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: role.id } });
    expect(tx.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: role.id, permissionId: permission.id }],
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { authVersion: { increment: 1 } } }),
    );
    expect(tx.refreshToken.updateMany).toHaveBeenCalled();
    expect(result.permissions[0]?.code).toBe('users.read');
  });
});
