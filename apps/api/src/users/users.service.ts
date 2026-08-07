import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto, UserStatusFilter } from './dto/list-users-query.dto';
import { PaginatedUsersDto, UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userWithRoles = { roles: { include: { role: true } } } satisfies Prisma.UserInclude;
type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userWithRoles }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(identity: AuthenticatedUser, query: ListUsersQueryDto): Promise<PaginatedUsersDto> {
    const where: Prisma.UserWhereInput = {
      companyId: identity.companyId,
      ...(query.status ? { isActive: query.status === UserStatusFilter.ACTIVE } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: userWithRoles,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.toResponse(user)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(
    identity: AuthenticatedUser,
    dto: CreateUserDto,
    requestId: string,
  ): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();
    await this.ensureRolesBelongToCompany(dto.roleIds, identity.companyId);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            companyId: identity.companyId,
            name: dto.name.trim(),
            email,
            passwordHash,
            roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
          },
          include: userWithRoles,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'User',
            entityId: user.id,
            action: 'user.created',
            after: { name: user.name, email: user.email, roleIds: dto.roleIds },
            requestId,
          },
        });
        return user;
      });
      return this.toResponse(created);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'E-mail já utilizado.',
        });
      }
      throw error;
    }
  }

  async findOne(identity: AuthenticatedUser, id: string): Promise<UserResponseDto> {
    return this.toResponse(await this.getScopedUser(identity.companyId, id));
  }

  async update(
    identity: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
    requestId: string,
  ): Promise<UserResponseDto> {
    const current = await this.getScopedUser(identity.companyId, id);
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
          },
          include: userWithRoles,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'User',
            entityId: id,
            action: 'user.updated',
            before: { name: current.name, email: current.email },
            after: { name: user.name, email: user.email },
            requestId,
          },
        });
        return user;
      });
      return this.toResponse(updated);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'E-mail já utilizado.',
        });
      }
      throw error;
    }
  }

  async updateStatus(
    identity: AuthenticatedUser,
    id: string,
    isActive: boolean,
    requestId: string,
  ): Promise<UserResponseDto> {
    if (identity.userId === id && !isActive) {
      throw new UnprocessableEntityException({
        code: 'SELF_DEACTIVATION_NOT_ALLOWED',
        message: 'Não é possível inativar a própria conta.',
      });
    }
    const current = await this.getScopedUser(identity.companyId, id);

    const updated = await this.prisma.$transaction(
      async (tx) => {
        if (
          !isActive &&
          current.isActive &&
          (await this.isAdministrator(tx, id, identity.companyId))
        ) {
          await this.ensureAnotherActiveAdministrator(tx, identity.companyId);
        }
        const user = await tx.user.update({
          where: { id },
          data: {
            isActive,
            ...(!isActive && current.isActive ? { authVersion: { increment: 1 } } : {}),
          },
          include: userWithRoles,
        });
        if (!isActive) {
          await tx.refreshToken.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'User',
            entityId: id,
            action: isActive ? 'user.activated' : 'user.deactivated',
            before: { isActive: current.isActive },
            after: { isActive },
            requestId,
          },
        });
        return user;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.toResponse(updated);
  }

  async replaceRoles(
    identity: AuthenticatedUser,
    id: string,
    roleIds: string[],
    requestId: string,
  ): Promise<UserResponseDto> {
    const current = await this.getScopedUser(identity.companyId, id);
    await this.ensureRolesBelongToCompany(roleIds, identity.companyId);

    const updated = await this.prisma.$transaction(
      async (tx) => {
        const wasAdmin = await this.isAdministrator(tx, id, identity.companyId);
        const remainsAdmin = roleIds.length
          ? Boolean(
              await tx.role.findFirst({
                where: {
                  id: { in: roleIds },
                  companyId: identity.companyId,
                  permissions: {
                    some: { permission: { resource: 'users', action: 'manage_roles' } },
                  },
                },
                select: { id: true },
              }),
            )
          : false;
        if (current.isActive && wasAdmin && !remainsAdmin) {
          await this.ensureAnotherActiveAdministrator(tx, identity.companyId);
        }

        await tx.userRole.deleteMany({ where: { userId: id } });
        if (roleIds.length) {
          await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
        }
        await tx.user.update({ where: { id }, data: { authVersion: { increment: 1 } } });
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'User',
            entityId: id,
            action: 'user.roles.replaced',
            before: { roleIds: current.roles.map(({ role }) => role.id) },
            after: { roleIds },
            requestId,
          },
        });
        return tx.user.findUniqueOrThrow({ where: { id }, include: userWithRoles });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.toResponse(updated);
  }

  private async getScopedUser(companyId: string, id: string): Promise<UserWithRoles> {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
      include: userWithRoles,
    });
    if (!user)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' });
    return user;
  }

  private async ensureRolesBelongToCompany(roleIds: string[], companyId: string): Promise<void> {
    if (!roleIds.length) return;
    const count = await this.prisma.role.count({ where: { id: { in: roleIds }, companyId } });
    if (count !== roleIds.length) {
      throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Papel não encontrado.' });
    }
  }

  private isAdministrator(tx: Prisma.TransactionClient, userId: string, companyId: string) {
    return tx.user
      .count({
        where: {
          id: userId,
          companyId,
          isActive: true,
          roles: {
            some: {
              role: {
                companyId,
                permissions: {
                  some: { permission: { resource: 'users', action: 'manage_roles' } },
                },
              },
            },
          },
        },
      })
      .then((count) => count > 0);
  }

  private async ensureAnotherActiveAdministrator(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<void> {
    const count = await tx.user.count({
      where: {
        companyId,
        isActive: true,
        roles: {
          some: {
            role: {
              companyId,
              permissions: {
                some: { permission: { resource: 'users', action: 'manage_roles' } },
              },
            },
          },
        },
      },
    });
    if (count <= 1) {
      throw new UnprocessableEntityException({
        code: 'LAST_ADMINISTRATOR',
        message: 'A empresa deve manter ao menos um administrador ativo.',
      });
    }
  }

  private toResponse(user: UserWithRoles): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      roles: user.roles.map(({ role }) => ({ id: role.id, name: role.name })),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
