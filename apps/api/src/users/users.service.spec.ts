import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UsersService } from './users.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

jest.mock('bcrypt', () => ({ hash: jest.fn() }));
const bcryptHashMock = bcrypt.hash as unknown as { mockResolvedValue(value: string): void };

describe('UsersService', () => {
  const identity: AuthenticatedUser = {
    userId: '10000000-0000-4000-8000-000000000001',
    companyId: '20000000-0000-4000-8000-000000000001',
    companyName: 'Empresa de teste',
    name: 'Admin',
    email: 'admin@erp.local',
    authVersion: 1,
    roles: ['Administrator'],
    permissions: ['users.read', 'users.create', 'users.manage_roles'],
  };
  const role = {
    id: '30000000-0000-4000-8000-000000000001',
    companyId: identity.companyId,
    name: 'Operator',
    description: null,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const user = {
    id: '40000000-0000-4000-8000-000000000001',
    companyId: identity.companyId,
    name: 'User',
    email: 'user@erp.local',
    passwordHash: 'hash',
    authVersion: 1,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [
      {
        userId: '40000000-0000-4000-8000-000000000001',
        roleId: role.id,
        createdAt: new Date(),
        role,
      },
    ],
  };
  const tx = {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    role: { findFirst: jest.fn() },
    userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    user: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    role: { count: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new UsersService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) => {
      if (Array.isArray(value)) return Promise.all(value);
      return (value as (client: typeof tx) => Promise<unknown>)(tx);
    });
    prisma.role.count.mockResolvedValue(1);
    prisma.user.findFirst.mockResolvedValue(user);
    tx.user.create.mockResolvedValue(user);
    tx.user.update.mockResolvedValue(user);
    tx.user.count.mockResolvedValue(0);
    tx.user.findUniqueOrThrow.mockResolvedValue(user);
    tx.auditLog.create.mockResolvedValue({});
    tx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    bcryptHashMock.mockResolvedValue('bcrypt-hash');
  });

  it('cria usuário usando hash de senha e companyId autenticado', async () => {
    const result = await service.create(
      identity,
      { name: 'User', email: 'USER@ERP.LOCAL', password: 'password-with-12', roleIds: [role.id] },
      'request-1',
    );

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: identity.companyId,
          email: 'user@erp.local',
          passwordHash: 'bcrypt-hash',
        }),
      }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('retorna conflito para e-mail duplicado', async () => {
    tx.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.0',
      }),
    );

    await expect(
      service.create(
        identity,
        { name: 'User', email: user.email, password: 'password-with-12', roleIds: [] },
        'request-2',
      ),
    ).rejects.toEqual(expect.any(ConflictException));
  });

  it('bloqueia atribuição de papéis na criação sem users.manage_roles', async () => {
    await expect(
      service.create(
        { ...identity, permissions: ['users.create'] },
        { name: 'User', email: user.email, password: 'password-with-12', roleIds: [role.id] },
        'request-role-escalation',
      ),
    ).rejects.toEqual(expect.any(ForbiddenException));
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('limita a listagem à empresa autenticada', async () => {
    prisma.user.findMany.mockResolvedValue([user]);
    prisma.user.count.mockResolvedValue(1);

    await service.findAll(identity, new ListUsersQueryDto());

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: identity.companyId }),
      }),
    );
  });

  it('não revela usuário pertencente a outra empresa', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findOne(identity, user.id)).rejects.toEqual(expect.any(NotFoundException));
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: user.id, companyId: identity.companyId } }),
    );
  });

  it('revoga refresh tokens ao inativar usuário', async () => {
    tx.user.update.mockResolvedValue({ ...user, isActive: false });

    await service.updateStatus(identity, user.id, false, 'request-3');

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authVersion: { increment: 1 } }) }),
    );
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: user.id, revokedAt: null } }),
    );
  });

  it('bloqueia auto-inativação', async () => {
    await expect(
      service.updateStatus(identity, identity.userId, false, 'request-4'),
    ).rejects.toEqual(expect.any(UnprocessableEntityException));
  });

  it('protege o último administrador ativo', async () => {
    tx.user.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    await expect(service.updateStatus(identity, user.id, false, 'request-5')).rejects.toEqual(
      expect.any(UnprocessableEntityException),
    );
  });

  it('rejeita atribuição de papel de outra empresa', async () => {
    prisma.role.count.mockResolvedValue(0);

    await expect(service.replaceRoles(identity, user.id, [role.id], 'request-6')).rejects.toEqual(
      expect.any(NotFoundException),
    );
  });
});
