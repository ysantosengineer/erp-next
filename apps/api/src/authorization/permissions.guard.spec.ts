import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const identity: AuthenticatedUser = {
    userId: '10000000-0000-4000-8000-000000000001',
    companyId: '20000000-0000-4000-8000-000000000001',
    companyName: 'Empresa de teste',
    name: 'Admin',
    email: 'admin@erp.local',
    authVersion: 1,
    roles: ['Administrator'],
    permissions: ['users.read'],
  };
  const reflector = { getAllAndOverride: jest.fn() };
  const prisma = { user: { findFirst: jest.fn() } };
  const guard = new PermissionsGuard(reflector as never, prisma as never);
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user: identity }) }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(['users.read']);
  });

  it('permite acesso quando o usuário possui a permissão atual no banco', async () => {
    prisma.user.findFirst.mockResolvedValue({
      authVersion: 1,
      roles: [
        {
          role: {
            permissions: [{ permission: { resource: 'users', action: 'read' } }],
          },
        },
      ],
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('nega acesso quando a permissão não foi concedida', async () => {
    prisma.user.findFirst.mockResolvedValue({ authVersion: 1, roles: [] });

    await expect(guard.canActivate(context)).rejects.toEqual(expect.any(ForbiddenException));
  });

  it('bloqueia usuário inativo ou fora da empresa autenticada', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toEqual(expect.any(UnauthorizedException));
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: identity.userId,
          companyId: identity.companyId,
          isActive: true,
        }),
      }),
    );
  });
});
