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
  CreateStockLocationDto,
  ListStockLocationsQueryDto,
  StockLocationResponseDto,
  StockLocationStatusFilter,
  UpdateStockLocationDto,
} from './dto/stock-location.dto';

@Injectable()
export class StockLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    identity: AuthenticatedUser,
    warehouseId: string,
    query: ListStockLocationsQueryDto,
  ) {
    const warehouse = await this.getWarehouseScoped(identity.companyId, warehouseId);
    const where: Prisma.StockLocationWhereInput = {
      companyId: identity.companyId,
      warehouseId,
      ...(query.status ? { isActive: query.status === StockLocationStatusFilter.ACTIVE } : {}),
      ...(query.zone ? { zone: query.zone.trim().toUpperCase() } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { zone: { contains: query.search, mode: 'insensitive' } },
              { aisle: { contains: query.search, mode: 'insensitive' } },
              { rack: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [locations, total] = await this.prisma.$transaction([
      this.prisma.stockLocation.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.stockLocation.count({ where }),
    ]);
    return {
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        isActive: warehouse.isActive,
      },
      data: locations.map((location) => this.toResponse(location)),
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
    warehouseId: string,
    dto: CreateStockLocationDto,
    requestId: string,
  ) {
    const warehouse = await this.getWarehouseScoped(identity.companyId, warehouseId);
    if (!warehouse.isActive) {
      throw new UnprocessableEntityException({
        code: 'WAREHOUSE_INACTIVE',
        message: 'O depósito está inativo.',
      });
    }
    try {
      const location = await this.prisma.$transaction(async (tx) => {
        const created = await tx.stockLocation.create({
          data: {
            companyId: identity.companyId,
            warehouseId,
            code: this.normalize(dto.code),
            description: this.optional(dto.description),
            zone: this.optionalUpper(dto.zone),
            aisle: this.optionalUpper(dto.aisle),
            rack: this.optionalUpper(dto.rack),
            level: this.optionalUpper(dto.level),
            position: this.optionalUpper(dto.position),
            capacity: this.optionalDecimal(dto.capacity),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'StockLocation',
            entityId: created.id,
            action: 'stock_location.created',
            after: this.auditSnapshot(created),
            requestId,
          },
        });
        return created;
      });
      return this.toResponse(location);
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
    }
  }

  async findOne(identity: AuthenticatedUser, warehouseId: string, id: string) {
    return this.toResponse(await this.getScoped(identity.companyId, warehouseId, id));
  }

  async update(
    identity: AuthenticatedUser,
    warehouseId: string,
    id: string,
    dto: UpdateStockLocationDto,
    requestId: string,
  ) {
    if (dto.code === null) {
      throw new BadRequestException({
        code: 'INVALID_STOCK_LOCATION_DATA',
        message: 'Código não aceita valor nulo.',
      });
    }
    const current = await this.getScoped(identity.companyId, warehouseId, id);
    try {
      const location = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.stockLocation.update({
          where: { id },
          data: {
            ...(dto.code !== undefined ? { code: this.normalize(dto.code) } : {}),
            ...(dto.description !== undefined
              ? { description: this.optional(dto.description) }
              : {}),
            ...(dto.zone !== undefined ? { zone: this.optionalUpper(dto.zone) } : {}),
            ...(dto.aisle !== undefined ? { aisle: this.optionalUpper(dto.aisle) } : {}),
            ...(dto.rack !== undefined ? { rack: this.optionalUpper(dto.rack) } : {}),
            ...(dto.level !== undefined ? { level: this.optionalUpper(dto.level) } : {}),
            ...(dto.position !== undefined ? { position: this.optionalUpper(dto.position) } : {}),
            ...(dto.capacity !== undefined ? { capacity: this.optionalDecimal(dto.capacity) } : {}),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'StockLocation',
            entityId: id,
            action: 'stock_location.updated',
            before: this.auditSnapshot(current),
            after: { ...this.auditSnapshot(updated), changedFields: Object.keys(dto) },
            requestId,
          },
        });
        return updated;
      });
      return this.toResponse(location);
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
    }
  }

  async updateStatus(
    identity: AuthenticatedUser,
    warehouseId: string,
    id: string,
    isActive: boolean,
    requestId: string,
  ) {
    const current = await this.getScoped(identity.companyId, warehouseId, id);
    if (isActive) {
      const warehouse = await this.getWarehouseScoped(identity.companyId, warehouseId);
      if (!warehouse.isActive) {
        throw new UnprocessableEntityException({
          code: 'WAREHOUSE_INACTIVE',
          message: 'Ative o depósito antes de reativar o endereço.',
        });
      }
    }
    const location = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.stockLocation.update({ where: { id }, data: { isActive } });
      await tx.auditLog.create({
        data: {
          actorId: identity.userId,
          companyId: identity.companyId,
          entity: 'StockLocation',
          entityId: id,
          action: isActive ? 'stock_location.activated' : 'stock_location.deactivated',
          before: { isActive: current.isActive },
          after: { isActive },
          requestId,
        },
      });
      return updated;
    });
    return this.toResponse(location);
  }

  private async getWarehouseScoped(companyId: string, warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId },
    });
    if (!warehouse) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Depósito não encontrado.',
      });
    }
    return warehouse;
  }

  private async getScoped(companyId: string, warehouseId: string, id: string) {
    const location = await this.prisma.stockLocation.findFirst({
      where: { id, warehouseId, companyId },
    });
    if (!location) {
      throw new NotFoundException({
        code: 'STOCK_LOCATION_NOT_FOUND',
        message: 'Endereço de estoque não encontrado.',
      });
    }
    return location;
  }

  private normalize(value: string) {
    return value.trim().toUpperCase();
  }
  private optional(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value.trim() || null;
  }
  private optionalUpper(value?: string | null) {
    const normalized = this.optional(value);
    return normalized ? normalized.toUpperCase() : normalized;
  }
  private optionalDecimal(value?: string | null) {
    return value ? new Prisma.Decimal(value) : null;
  }
  private auditSnapshot(location: {
    warehouseId: string;
    code: string;
    zone: string | null;
    aisle: string | null;
    rack: string | null;
    level: string | null;
    position: string | null;
    capacity: Prisma.Decimal | null;
    isActive: boolean;
  }) {
    return {
      warehouseId: location.warehouseId,
      code: location.code,
      zone: location.zone,
      aisle: location.aisle,
      rack: location.rack,
      level: location.level,
      position: location.position,
      capacity: location.capacity?.toFixed(3) ?? null,
      isActive: location.isActive,
    };
  }
  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ConflictException({
        code: 'STOCK_LOCATION_CODE_EXISTS',
        message: 'Código de endereço já utilizado neste depósito.',
      });
    throw error;
  }
  private toResponse(location: {
    id: string;
    warehouseId: string;
    code: string;
    description: string | null;
    zone: string | null;
    aisle: string | null;
    rack: string | null;
    level: string | null;
    position: string | null;
    capacity: Prisma.Decimal | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): StockLocationResponseDto {
    return {
      id: location.id,
      warehouseId: location.warehouseId,
      code: location.code,
      description: location.description,
      zone: location.zone,
      aisle: location.aisle,
      rack: location.rack,
      level: location.level,
      position: location.position,
      capacity: location.capacity?.toFixed(3) ?? null,
      isActive: location.isActive,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }
}
