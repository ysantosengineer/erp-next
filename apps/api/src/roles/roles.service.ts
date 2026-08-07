import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ADMINISTRATIVE_PERMISSIONS } from '../authorization/permissions.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const roleWithPermissions = {
  permissions: { include: { permission: true } },
} satisfies Prisma.RoleInclude;
type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleWithPermissions }>;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(identity: AuthenticatedUser): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      where: { companyId: identity.companyId },
      include: roleWithPermissions,
      orderBy: { name: 'asc' },
    });
    return roles.map((role) => this.toResponse(role));
  }

  async create(
    identity: AuthenticatedUser,
    dto: CreateRoleDto,
    requestId: string,
  ): Promise<RoleResponseDto> {
    await this.getPermissions(dto.permissionIds);
    try {
      const role = await this.prisma.$transaction(async (tx) => {
        const created = await tx.role.create({
          data: {
            companyId: identity.companyId,
            name: dto.name.trim(),
            description: dto.description?.trim(),
            permissions: {
              create: dto.permissionIds.map((permissionId) => ({ permissionId })),
            },
          },
          include: roleWithPermissions,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Role',
            entityId: created.id,
            action: 'role.created',
            after: { name: created.name, permissionIds: dto.permissionIds },
            requestId,
          },
        });
        return created;
      });
      return this.toResponse(role);
    } catch (error: unknown) {
      this.rethrowUniqueName(error);
    }
  }

  async findOne(identity: AuthenticatedUser, id: string): Promise<RoleResponseDto> {
    return this.toResponse(await this.getScopedRole(identity.companyId, id));
  }

  async update(
    identity: AuthenticatedUser,
    id: string,
    dto: UpdateRoleDto,
    requestId: string,
  ): Promise<RoleResponseDto> {
    const current = await this.getScopedRole(identity.companyId, id);
    if (current.isSystem && dto.name !== undefined && dto.name.trim() !== current.name) {
      throw new UnprocessableEntityException({
        code: 'SYSTEM_ROLE_PROTECTED',
        message: 'O papel administrativo do sistema é protegido.',
      });
    }
    try {
      const role = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.role.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          },
          include: roleWithPermissions,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Role',
            entityId: id,
            action: 'role.updated',
            before: { name: current.name, description: current.description },
            after: { name: updated.name, description: updated.description },
            requestId,
          },
        });
        return updated;
      });
      return this.toResponse(role);
    } catch (error: unknown) {
      this.rethrowUniqueName(error);
    }
  }

  async remove(identity: AuthenticatedUser, id: string, requestId: string): Promise<void> {
    const role = await this.getScopedRole(identity.companyId, id);
    if (role.isSystem) {
      await this.auditBlockedDeletion(identity, role.id, 'system_role', requestId);
      throw new UnprocessableEntityException({
        code: 'SYSTEM_ROLE_PROTECTED',
        message: 'O papel administrativo do sistema é protegido.',
      });
    }
    const usersCount = await this.prisma.userRole.count({
      where: { roleId: id, user: { companyId: identity.companyId } },
    });
    if (usersCount > 0) {
      await this.auditBlockedDeletion(identity, role.id, 'role_in_use', requestId);
      throw new ConflictException({
        code: 'ROLE_IN_USE',
        message: 'O papel está atribuído a usuários.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: identity.userId,
          companyId: identity.companyId,
          entity: 'Role',
          entityId: id,
          action: 'role.deleted',
          before: { name: role.name },
          requestId,
        },
      });
    });
  }

  async replacePermissions(
    identity: AuthenticatedUser,
    id: string,
    permissionIds: string[],
    requestId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.getScopedRole(identity.companyId, id);
    const permissions = await this.getPermissions(permissionIds);
    const codes = new Set(permissions.map(({ resource, action }) => `${resource}.${action}`));
    if (role.isSystem && !ADMINISTRATIVE_PERMISSIONS.every((permission) => codes.has(permission))) {
      throw new UnprocessableEntityException({
        code: 'SYSTEM_ROLE_PERMISSIONS_REQUIRED',
        message: 'O papel administrativo deve manter todas as permissões essenciais.',
      });
    }

    const updated = await this.prisma.$transaction(
      async (tx) => {
        const removedAdministrativeAccess =
          role.permissions.some(
            ({ permission }) =>
              permission.resource === 'users' && permission.action === 'manage_roles',
          ) && !codes.has('users.manage_roles');
        if (removedAdministrativeAccess) {
          const [affectedActiveUsers, administratorsUsingOtherRoles] = await Promise.all([
            tx.user.count({
              where: {
                companyId: identity.companyId,
                isActive: true,
                roles: { some: { roleId: id } },
              },
            }),
            tx.user.count({
              where: {
                companyId: identity.companyId,
                isActive: true,
                roles: {
                  some: {
                    role: {
                      id: { not: id },
                      companyId: identity.companyId,
                      permissions: {
                        some: { permission: { resource: 'users', action: 'manage_roles' } },
                      },
                    },
                  },
                },
              },
            }),
          ]);
          if (affectedActiveUsers > 0 && administratorsUsingOtherRoles === 0) {
            throw new UnprocessableEntityException({
              code: 'LAST_ADMINISTRATOR',
              message: 'A empresa deve manter ao menos um administrador ativo.',
            });
          }
        }
        const assignments = await tx.userRole.findMany({
          where: { roleId: id, user: { companyId: identity.companyId } },
          select: { userId: true },
        });
        const userIds = assignments.map(({ userId }) => userId);
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionIds.length) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          });
        }
        if (userIds.length) {
          await tx.user.updateMany({
            where: { id: { in: userIds }, companyId: identity.companyId },
            data: { authVersion: { increment: 1 } },
          });
          await tx.refreshToken.updateMany({
            where: { userId: { in: userIds }, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Role',
            entityId: id,
            action: 'role.permissions.replaced',
            before: { permissionIds: role.permissions.map(({ permission }) => permission.id) },
            after: { permissionIds },
            requestId,
          },
        });
        return tx.role.findUniqueOrThrow({ where: { id }, include: roleWithPermissions });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.toResponse(updated);
  }

  private async getScopedRole(companyId: string, id: string): Promise<RoleWithPermissions> {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId },
      include: roleWithPermissions,
    });
    if (!role)
      throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Papel não encontrado.' });
    return role;
  }

  private async getPermissions(ids: string[]) {
    if (!ids.length) return [];
    const permissions = await this.prisma.permission.findMany({ where: { id: { in: ids } } });
    if (permissions.length !== ids.length) {
      throw new NotFoundException({
        code: 'PERMISSION_NOT_FOUND',
        message: 'Permissão não encontrada.',
      });
    }
    return permissions;
  }

  private auditBlockedDeletion(
    identity: AuthenticatedUser,
    roleId: string,
    reason: string,
    requestId: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId: identity.userId,
        companyId: identity.companyId,
        entity: 'Role',
        entityId: roleId,
        action: 'role.deletion.blocked',
        after: { reason },
        requestId,
      },
    });
  }

  private rethrowUniqueName(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({
        code: 'ROLE_NAME_EXISTS',
        message: 'Nome de papel já utilizado.',
      });
    }
    throw error;
  }

  private toResponse(role: RoleWithPermissions): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(({ permission }) => ({
        id: permission.id,
        code: `${permission.resource}.${permission.action}`,
        description: permission.description,
      })),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}
