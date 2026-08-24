import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessTokenPayload, AuthenticatedUser } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      issuer: configService.getOrThrow<string>('JWT_ISSUER'),
      audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        authVersion: true,
        isActive: true,
        companyId: true,
        company: { select: { isActive: true, name: true } },
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: { permission: { select: { resource: true, action: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.authVersion !== payload.authVersion ||
      !user.company.isActive
    ) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Sessão inválida.',
      });
    }

    return {
      userId: user.id,
      companyId: user.companyId,
      companyName: user.company.name,
      name: user.name,
      email: user.email,
      authVersion: user.authVersion,
      roles: user.roles.map(({ role }) => role.name),
      permissions: [
        ...new Set(
          user.roles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => `${permission.resource}.${permission.action}`),
          ),
        ),
      ],
    };
  }
}
