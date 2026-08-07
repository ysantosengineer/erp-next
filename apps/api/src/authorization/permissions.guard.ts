import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const identity = request.user;
    if (!identity) throw this.invalidSession();

    const user = await this.prisma.user.findFirst({
      where: {
        id: identity.userId,
        companyId: identity.companyId,
        isActive: true,
        company: { isActive: true },
      },
      select: {
        authVersion: true,
        roles: {
          where: { role: { companyId: identity.companyId } },
          select: {
            role: {
              select: {
                permissions: {
                  select: { permission: { select: { resource: true, action: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.authVersion !== identity.authVersion) throw this.invalidSession();

    const granted = new Set(
      user.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => `${permission.resource}.${permission.action}`),
      ),
    );
    if (!required.every((permission) => granted.has(permission))) {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Acesso negado.' });
    }

    return true;
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException({ code: 'INVALID_SESSION', message: 'Sessão inválida.' });
  }
}
