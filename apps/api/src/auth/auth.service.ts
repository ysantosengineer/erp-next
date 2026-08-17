import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, RefreshTokenPayload } from './auth.types';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginDto } from './dto/login.dto';

type LoginUser = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  passwordHash: string;
  authVersion: number;
  isActive: boolean;
};

export type IssuedTokens = AuthTokensDto & {
  refreshToken: string;
  refreshTokenId: string;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, requestId: string): Promise<IssuedTokens> {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        authVersion: true,
        isActive: true,
        companyId: true,
        company: { select: { isActive: true } },
      },
    });

    const passwordMatches = user
      ? await bcrypt.compare(loginDto.password, user.passwordHash)
      : false;

    if (!user?.company.isActive || !user.isActive || !passwordMatches) {
      await this.recordFailedLogin(email, requestId);
      throw this.invalidCredentialsException();
    }

    const tokens = await this.issueTokens(user);
    const refreshTokenHash = this.hashToken(tokens.refreshToken);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await transaction.refreshToken.create({
        data: {
          id: tokens.refreshTokenId,
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt: tokens.refreshTokenExpiresAt,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          companyId: user.companyId,
          entity: 'Auth',
          entityId: user.id,
          action: 'auth.login.succeeded',
          requestId,
        },
      });
    });

    this.logger.log(`Login bem-sucedido para o usuário ${user.id}.`);
    return tokens;
  }

  async refresh(refreshToken: string, requestId: string): Promise<IssuedTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const refreshTokenHash = this.hashToken(refreshToken);

    return this.prisma.$transaction(async (transaction) => {
      const [storedToken, user] = await Promise.all([
        transaction.refreshToken.findUnique({ where: { id: payload.jti } }),
        transaction.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            authVersion: true,
            isActive: true,
            companyId: true,
            company: { select: { isActive: true } },
          },
        }),
      ]);

      if (
        !storedToken ||
        storedToken.userId !== payload.sub ||
        storedToken.revokedAt ||
        storedToken.expiresAt <= new Date() ||
        !this.tokenHashesMatch(storedToken.tokenHash, refreshTokenHash) ||
        !user ||
        !user.isActive ||
        user.authVersion !== payload.authVersion ||
        !user.company.isActive
      ) {
        throw this.invalidSessionException();
      }

      const rotation = await this.issueTokens(user);
      const revokedToken = await transaction.refreshToken.updateMany({
        where: { id: storedToken.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (revokedToken.count !== 1) {
        throw this.invalidSessionException();
      }

      await transaction.refreshToken.create({
        data: {
          id: rotation.refreshTokenId,
          userId: user.id,
          tokenHash: this.hashToken(rotation.refreshToken),
          expiresAt: rotation.refreshTokenExpiresAt,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          companyId: user.companyId,
          entity: 'Auth',
          entityId: user.id,
          action: 'auth.refresh.succeeded',
          requestId,
        },
      });

      this.logger.log(`Refresh de sessão para o usuário ${user.id}.`);
      return rotation;
    });
  }

  async logout(refreshToken: string, requestId: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { companyId: true },
    });

    if (!user) {
      throw this.invalidSessionException();
    }

    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: payload.jti, userId: payload.sub, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) {
        throw this.invalidSessionException();
      }
      await transaction.auditLog.create({
        data: {
          actorId: payload.sub,
          companyId: user.companyId,
          entity: 'Auth',
          entityId: payload.sub,
          action: 'auth.logout.succeeded',
          requestId,
        },
      });
    });
    this.logger.log(`Logout do usuário ${payload.sub}.`);
  }

  getCurrentUser(user: AuthenticatedUser): CurrentUserDto {
    return {
      id: user.userId,
      company: { id: user.companyId, name: user.companyName },
      name: user.name,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  toAuthTokens(tokens: IssuedTokens): AuthTokensDto {
    return {
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
    };
  }

  private async issueTokens(user: LoginUser): Promise<IssuedTokens> {
    const accessTtl = Number(this.configService.getOrThrow<string>('JWT_ACCESS_TTL_SECONDS'));
    const refreshTtl = Number(this.configService.getOrThrow<string>('JWT_REFRESH_TTL_SECONDS'));
    const refreshTokenId = randomUUID();
    const payload = { sub: user.id, authVersion: user.authVersion };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: accessTtl }),
      this.jwtService.signAsync(
        { ...payload, jti: refreshTokenId },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshTtl,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTtl,
      refreshTokenId,
      refreshTokenExpiresAt: new Date(Date.now() + refreshTtl * 1000),
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw this.invalidSessionException();
    }
  }

  private async recordFailedLogin(email: string, requestId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entity: 'Auth',
        entityId: this.hashToken(email),
        action: 'auth.login.failed',
        requestId,
      },
    });
    this.logger.warn('Tentativa de login recusada.');
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private tokenHashesMatch(storedHash: string, candidateHash: string): boolean {
    return timingSafeEqual(Buffer.from(storedHash), Buffer.from(candidateHash));
  }

  private invalidCredentialsException(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciais inválidas.',
    });
  }

  private invalidSessionException(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_SESSION',
      message: 'Sessão inválida.',
    });
  }
}
