import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWarehouseDto,
  ListWarehousesQueryDto,
  UpdateWarehouseDto,
  WarehouseResponseDto,
  WarehouseStatusFilter,
} from './dto/warehouse.dto';

const warehouseInclude = {
  _count: { select: { locations: true } },
} satisfies Prisma.WarehouseInclude;
type WarehouseWithCount = Prisma.WarehouseGetPayload<{ include: typeof warehouseInclude }>;

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(identity: AuthenticatedUser, query: ListWarehousesQueryDto) {
    const where: Prisma.WarehouseWhereInput = {
      companyId: identity.companyId,
      ...(query.status ? { isActive: query.status === WarehouseStatusFilter.ACTIVE } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [warehouses, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        include: warehouseInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.warehouse.count({ where }),
    ]);
    return {
      data: warehouses.map((warehouse) => this.toResponse(warehouse)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(identity: AuthenticatedUser, dto: CreateWarehouseDto, requestId: string) {
    try {
      const warehouse = await this.prisma.$transaction(async (tx) => {
        const created = await tx.warehouse.create({
          data: {
            companyId: identity.companyId,
            name: dto.name.trim(),
            code: this.normalizeCode(dto.code),
            description: this.optional(dto.description),
          },
          include: warehouseInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Warehouse',
            entityId: created.id,
            action: 'warehouse.created',
            after: this.auditSnapshot(created),
            requestId,
          },
        });
        return created;
      });
      return this.toResponse(warehouse);
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
    }
  }

  async findOne(identity: AuthenticatedUser, id: string) {
    return this.toResponse(await this.getScoped(identity.companyId, id));
  }

  async update(
    identity: AuthenticatedUser,
    id: string,
    dto: UpdateWarehouseDto,
    requestId: string,
  ) {
    if (dto.name === null || dto.code === null) {
      throw new BadRequestException({
        code: 'INVALID_WAREHOUSE_DATA',
        message: 'Nome e código não aceitam valor nulo.',
      });
    }
    const current = await this.getScoped(identity.companyId, id);
    try {
      const warehouse = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.warehouse.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.code !== undefined ? { code: this.normalizeCode(dto.code) } : {}),
            ...(dto.description !== undefined
              ? { description: this.optional(dto.description) }
              : {}),
          },
          include: warehouseInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Warehouse',
            entityId: id,
            action: 'warehouse.updated',
            before: this.auditSnapshot(current),
            after: { ...this.auditSnapshot(updated), changedFields: Object.keys(dto) },
            requestId,
          },
        });
        return updated;
      });
      return this.toResponse(warehouse);
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
    }
  }

  async updateStatus(
    identity: AuthenticatedUser,
    id: string,
    isActive: boolean,
    requestId: string,
  ) {
    const current = await this.getScoped(identity.companyId, id);
    if (!isActive) {
      const activeLocations = await this.prisma.stockLocation.count({
        where: { companyId: identity.companyId, warehouseId: id, isActive: true },
      });
      if (activeLocations > 0) {
        throw new UnprocessableEntityException({
          code: 'WAREHOUSE_HAS_ACTIVE_LOCATIONS',
          message: 'Inative os endereços ativos antes de inativar o depósito.',
        });
      }
    }
    const warehouse = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.warehouse.update({
        where: { id },
        data: { isActive },
        include: warehouseInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId: identity.userId,
          companyId: identity.companyId,
          entity: 'Warehouse',
          entityId: id,
          action: isActive ? 'warehouse.activated' : 'warehouse.deactivated',
          before: { isActive: current.isActive },
          after: { isActive },
          requestId,
        },
      });
      return updated;
    });
    return this.toResponse(warehouse);
  }

  private async getScoped(companyId: string, id: string): Promise<WarehouseWithCount> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, companyId },
      include: warehouseInclude,
    });
    if (!warehouse) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Depósito não encontrado.',
      });
    }
    return warehouse;
  }

  private normalizeCode(value: string) {
    return value.trim().toUpperCase();
  }

  private optional(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value.trim() || null;
  }

  private auditSnapshot(warehouse: WarehouseWithCount) {
    return {
      name: warehouse.name,
      code: warehouse.code,
      isActive: warehouse.isActive,
      locationCount: warehouse._count.locations,
    };
  }

  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({
        code: 'WAREHOUSE_CODE_EXISTS',
        message: 'Código de depósito já utilizado nesta empresa.',
      });
    }
    throw error;
  }

  private toResponse(warehouse: WarehouseWithCount): WarehouseResponseDto {
    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      description: warehouse.description,
      isActive: warehouse.isActive,
      locationCount: warehouse._count.locations,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    };
  }
}
