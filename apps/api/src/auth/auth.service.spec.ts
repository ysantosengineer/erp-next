import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const bcryptCompareMock = bcrypt.compare as unknown as {
  mockResolvedValue(value: boolean): void;
};

describe('AuthService', () => {
  const user = {
    id: 'f0630c13-8c2d-4c9a-b23d-585d0c07cf06',
    companyId: '42105ea7-c456-47c2-ab73-80bc4788442d',
    name: 'Administrator',
    email: 'admin@erp.local',
    passwordHash: '$2b$12$hashed-password',
    authVersion: 1,
    isActive: true,
    company: { isActive: true },
  };
  const transaction = {
    user: { update: jest.fn(), findUnique: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ISSUER: 'erp-next-api',
        JWT_AUDIENCE: 'erp-next-web',
      };

      return values[key];
    }),
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string | number> = {
        JWT_ACCESS_TTL_SECONDS: '900',
        JWT_REFRESH_TTL_SECONDS: '604800',
        JWT_REFRESH_SECRET: 'refresh-secret',
      };

      return values[key];
    }),
  };
  const service = new AuthService(prisma as never, jwtService as never, configService as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction),
    );
    prisma.user.findUnique.mockResolvedValue(user);
    transaction.user.update.mockResolvedValue(user);
    transaction.user.findUnique.mockResolvedValue(user);
    transaction.refreshToken.create.mockResolvedValue({});
    transaction.auditLog.create.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
  });

  it('emite tokens, atualiza o último login e persiste somente o hash do refresh token', async () => {
    bcryptCompareMock.mockResolvedValue(true);

    const issuedTokens = await service.login(
      { email: 'ADMIN@ERP.LOCAL', password: 'senha-segura-com-12-caracteres' },
      'request-1',
    );
    const result = service.toAuthTokens(issuedTokens);

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      }),
    );
    expect(result).not.toHaveProperty('refreshTokenId');
    expect(result).not.toHaveProperty('refreshTokenExpiresAt');
    expect(result).not.toHaveProperty('refreshToken');
    expect(transaction.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: user.id } }),
    );
    expect(transaction.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: user.id, tokenHash: expect.any(String) }),
      }),
    );
    expect(transaction.refreshToken.create.mock.calls[0][0].data.tokenHash).not.toBe(
      'refresh-token',
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({
        expiresIn: 900,
        issuer: 'erp-next-api',
        audience: 'erp-next-web',
      }),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.objectContaining({ expiresIn: 604800 }),
    );
  });

  it('rejeita login de usuário inativo sem revelar a causa', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });
    bcryptCompareMock.mockResolvedValue(true);

    await expect(
      service.login({ email: user.email, password: 'senha-segura-com-12-caracteres' }, 'request-2'),
    ).rejects.toEqual(expect.any(UnauthorizedException));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'auth.login.failed' }) }),
    );
  });

  it('rotaciona um refresh token válido e revoga o anterior', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id, authVersion: 1, jti: 'token-id' });
    transaction.refreshToken.findUnique.mockResolvedValue({
      id: 'token-id',
      userId: user.id,
      tokenHash: createHash('sha256').update('refresh-token').digest('hex'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    transaction.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    jwtService.signAsync
      .mockReset()
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh');

    const result = await service.refresh('refresh-token', 'request-3');

    expect(result.accessToken).toBe('new-access');
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'token-id', revokedAt: null } }),
    );
  });

  it('revoga o refresh token durante o logout', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id, authVersion: 1, jti: 'token-id' });
    transaction.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await service.logout('refresh-token', 'request-4');

    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'token-id', revokedAt: null }),
      }),
    );
  });
});
