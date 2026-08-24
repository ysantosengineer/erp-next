import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  InventoryCountStatus,
  Prisma,
  StockMovementType,
  StockReservationStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListInventoryBalancesQueryDto,
  ListStockMovementsQueryDto,
  StockAdjustmentDto,
  StockEntryDto,
  StockExitDto,
  StockTransferDto,
} from './dto/inventory.dto';

const balanceInclude = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      minimumStock: true,
      isActive: true,
      unit: { select: { symbol: true } },
    },
  },
  location: {
    select: {
      id: true,
      code: true,
      isActive: true,
      warehouse: { select: { id: true, name: true, code: true, isActive: true } },
    },
  },
} satisfies Prisma.InventoryBalanceInclude;

const movementInclude = {
  product: { select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } } },
  sourceLocation: {
    select: { id: true, code: true, warehouse: { select: { id: true, name: true, code: true } } },
  },
  destinationLocation: {
    select: { id: true, code: true, warehouse: { select: { id: true, name: true, code: true } } },
  },
  performedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.StockMovementInclude;

type MovementWithRelations = Prisma.StockMovementGetPayload<{ include: typeof movementInclude }>;
type MovementCommand = {
  type: StockMovementType;
  productId: string;
  quantity: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  reason?: string;
  idempotencyKey?: string;
};

type MovementExecutionOptions = {
  referenceType?: 'MANUAL' | 'INVENTORY' | 'PURCHASE_RECEIPT' | 'SALES_ORDER';
  referenceId?: string;
  bypassInventoryLock?: boolean;
  allowInactiveProduct?: boolean;
  reservationAllowance?: Prisma.Decimal;
};

export type InventoryAdjustmentCommand = {
  inventoryCountId: string;
  productId: string;
  locationId: string;
  quantity: string;
  direction: 'IN' | 'OUT';
  reason: string;
};

export type PurchaseReceiptEntryCommand = {
  purchaseReceiptId: string;
  productId: string;
  locationId: string;
  quantity: string;
  reason: string;
};

export type SalesOrderShipmentExitCommand = {
  salesOrderId: string;
  productId: string;
  locationId: string;
  quantity: string;
  reason: string;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findBalances(identity: AuthenticatedUser, query: ListInventoryBalancesQueryDto) {
    const where: Prisma.InventoryBalanceWhereInput = {
      companyId: identity.companyId,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.warehouseId ? { location: { warehouseId: query.warehouseId } } : {}),
      ...(query.search
        ? {
            OR: [
              { product: { name: { contains: query.search, mode: 'insensitive' } } },
              { product: { sku: { contains: query.search, mode: 'insensitive' } } },
              { location: { code: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryBalance.findMany({
        where,
        include: balanceInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.inventoryBalance.count({ where }),
    ]);
    const reserved = await this.activeReservedByBalance(
      identity.companyId,
      rows.map((row) => ({ productId: row.productId, locationId: row.locationId })),
    );
    return {
      data: rows.map((row) =>
        this.toBalance(row, reserved.get(this.balanceKey(row)) ?? this.zero()),
      ),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findBalance(identity: AuthenticatedUser, id: string) {
    const balance = await this.prisma.inventoryBalance.findFirst({
      where: { id, companyId: identity.companyId },
      include: balanceInclude,
    });
    if (!balance)
      throw new NotFoundException({
        code: 'INVENTORY_BALANCE_NOT_FOUND',
        message: 'Saldo não encontrado.',
      });
    const reserved = await this.prisma.stockReservation.aggregate({
      where: {
        companyId: identity.companyId,
        productId: balance.productId,
        locationId: balance.locationId,
        status: StockReservationStatus.ACTIVE,
      },
      _sum: { quantity: true },
    });
    return this.toBalance(balance, reserved._sum.quantity ?? this.zero());
  }

  async findProductBalance(identity: AuthenticatedUser, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId: identity.companyId },
      select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } },
    });
    if (!product)
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    const balances = await this.prisma.inventoryBalance.findMany({
      where: { companyId: identity.companyId, productId },
      include: { location: { include: { warehouse: true } } },
      orderBy: [{ location: { warehouse: { name: 'asc' } } }, { location: { code: 'asc' } }],
    });
    const reservedByBalance = await this.activeReservedByBalance(
      identity.companyId,
      balances.map((item) => ({ productId: item.productId, locationId: item.locationId })),
    );
    const total = balances.reduce((sum, item) => sum.add(item.quantity), this.zero());
    const totalReserved = [...reservedByBalance.values()].reduce(
      (sum, quantity) => sum.add(quantity),
      this.zero(),
    );
    const warehouseTotals = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        quantity: Prisma.Decimal;
        reservedQuantity: Prisma.Decimal;
      }
    >();
    for (const item of balances) {
      const warehouse = item.location.warehouse;
      const current = warehouseTotals.get(warehouse.id);
      warehouseTotals.set(warehouse.id, {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        quantity: (current?.quantity ?? this.zero()).add(item.quantity),
        reservedQuantity: (current?.reservedQuantity ?? this.zero()).add(
          reservedByBalance.get(this.balanceKey(item)) ?? this.zero(),
        ),
      });
    }
    return {
      product,
      totalQuantity: total.toFixed(4),
      totalReservedQuantity: totalReserved.toFixed(4),
      totalAvailableQuantity: total.sub(totalReserved).toFixed(4),
      warehouses: [...warehouseTotals.values()].map((item) => ({
        ...item,
        quantity: item.quantity.toFixed(4),
        reservedQuantity: item.reservedQuantity.toFixed(4),
        availableQuantity: item.quantity.sub(item.reservedQuantity).toFixed(4),
      })),
      locations: balances.map((item) => ({
        id: item.location.id,
        code: item.location.code,
        warehouse: {
          id: item.location.warehouse.id,
          name: item.location.warehouse.name,
          code: item.location.warehouse.code,
        },
        quantity: item.quantity.toFixed(4),
        reservedQuantity: (reservedByBalance.get(this.balanceKey(item)) ?? this.zero()).toFixed(4),
        availableQuantity: item.quantity
          .sub(reservedByBalance.get(this.balanceKey(item)) ?? this.zero())
          .toFixed(4),
      })),
    };
  }

  async options(identity: AuthenticatedUser) {
    const [products, locations] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { companyId: identity.companyId, isActive: true },
        select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.stockLocation.findMany({
        where: { companyId: identity.companyId, isActive: true, warehouse: { isActive: true } },
        select: {
          id: true,
          code: true,
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { code: 'asc' }],
      }),
    ]);
    return { products, locations };
  }

  async findMovements(identity: AuthenticatedUser, query: ListStockMovementsQueryDto) {
    const where: Prisma.StockMovementWhereInput = {
      companyId: identity.companyId,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.performedByUserId ? { performedByUserId: query.performedByUserId } : {}),
      ...(query.locationId || query.warehouseId
        ? {
            AND: [
              ...(query.locationId
                ? [
                    {
                      OR: [
                        { sourceLocationId: query.locationId },
                        { destinationLocationId: query.locationId },
                      ],
                    },
                  ]
                : []),
              ...(query.warehouseId
                ? [
                    {
                      OR: [
                        { sourceLocation: { warehouseId: query.warehouseId } },
                        { destinationLocation: { warehouseId: query.warehouseId } },
                      ],
                    },
                  ]
                : []),
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return {
      data: rows.map((row) => this.toMovement(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findMovement(identity: AuthenticatedUser, id: string) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, companyId: identity.companyId },
      include: movementInclude,
    });
    if (!movement)
      throw new NotFoundException({
        code: 'STOCK_MOVEMENT_NOT_FOUND',
        message: 'Movimentação não encontrada.',
      });
    return this.toMovement(movement);
  }

  entry(identity: AuthenticatedUser, dto: StockEntryDto, requestId: string) {
    return this.execute(identity, { type: StockMovementType.ENTRY, ...dto }, requestId);
  }

  exit(identity: AuthenticatedUser, dto: StockExitDto, requestId: string) {
    return this.execute(identity, { type: StockMovementType.EXIT, ...dto }, requestId);
  }

  adjustment(identity: AuthenticatedUser, dto: StockAdjustmentDto, requestId: string) {
    return this.execute(
      identity,
      {
        type:
          dto.direction === 'IN'
            ? StockMovementType.ADJUSTMENT_IN
            : StockMovementType.ADJUSTMENT_OUT,
        productId: dto.productId,
        quantity: dto.quantity,
        ...(dto.direction === 'IN'
          ? { destinationLocationId: dto.locationId }
          : { sourceLocationId: dto.locationId }),
        reason: dto.reason,
        idempotencyKey: dto.idempotencyKey,
      },
      requestId,
    );
  }

  transfer(identity: AuthenticatedUser, dto: StockTransferDto, requestId: string) {
    if (dto.sourceLocationId === dto.destinationLocationId) {
      throw new BadRequestException({
        code: 'SAME_TRANSFER_LOCATION',
        message: 'Origem e destino devem ser diferentes.',
      });
    }
    return this.execute(identity, { type: StockMovementType.TRANSFER, ...dto }, requestId);
  }

  async applyInventoryAdjustment(
    tx: Prisma.TransactionClient,
    identity: AuthenticatedUser,
    command: InventoryAdjustmentCommand,
    requestId: string,
  ): Promise<string> {
    const movement = await this.executeTransaction(
      tx,
      identity,
      {
        type:
          command.direction === 'IN'
            ? StockMovementType.ADJUSTMENT_IN
            : StockMovementType.ADJUSTMENT_OUT,
        productId: command.productId,
        quantity: command.quantity,
        ...(command.direction === 'IN'
          ? { destinationLocationId: command.locationId }
          : { sourceLocationId: command.locationId }),
        reason: command.reason,
      },
      requestId,
      {
        referenceType: 'INVENTORY',
        referenceId: command.inventoryCountId,
        bypassInventoryLock: true,
      },
    );
    return movement.id;
  }

  async applyPurchaseReceiptEntry(
    tx: Prisma.TransactionClient,
    identity: AuthenticatedUser,
    command: PurchaseReceiptEntryCommand,
    requestId: string,
  ): Promise<string> {
    const movement = await this.executeTransaction(
      tx,
      identity,
      {
        type: StockMovementType.ENTRY,
        productId: command.productId,
        quantity: command.quantity,
        destinationLocationId: command.locationId,
        reason: command.reason,
      },
      requestId,
      {
        referenceType: 'PURCHASE_RECEIPT',
        referenceId: command.purchaseReceiptId,
        allowInactiveProduct: true,
      },
    );
    return movement.id;
  }

  async applySalesOrderShipmentExit(
    tx: Prisma.TransactionClient,
    identity: AuthenticatedUser,
    command: SalesOrderShipmentExitCommand,
    requestId: string,
  ): Promise<string> {
    const quantity = new Prisma.Decimal(command.quantity);
    const movement = await this.executeTransaction(
      tx,
      identity,
      {
        type: StockMovementType.EXIT,
        productId: command.productId,
        quantity: command.quantity,
        sourceLocationId: command.locationId,
        reason: command.reason,
      },
      requestId,
      {
        referenceType: 'SALES_ORDER',
        referenceId: command.salesOrderId,
        allowInactiveProduct: true,
        reservationAllowance: quantity,
      },
    );
    return movement.id;
  }

  private async execute(identity: AuthenticatedUser, command: MovementCommand, requestId: string) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const movement = await this.prisma.$transaction(
          (tx) => this.executeTransaction(tx, identity, command, requestId),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return this.toMovement(movement);
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        )
          continue;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          command.idempotencyKey
        ) {
          const existing = await this.prisma.stockMovement.findUnique({
            where: {
              companyId_idempotencyKey: {
                companyId: identity.companyId,
                idempotencyKey: command.idempotencyKey,
              },
            },
            include: movementInclude,
          });
          if (existing && this.sameCommand(existing, command)) return this.toMovement(existing);
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'Chave de idempotência já utilizada com outros dados.',
          });
        }
        throw error;
      }
    }
    throw new ConflictException({
      code: 'INVENTORY_CONCURRENCY_CONFLICT',
      message: 'Conflito concorrente. Tente novamente.',
    });
  }

  private async executeTransaction(
    tx: Prisma.TransactionClient,
    identity: AuthenticatedUser,
    command: MovementCommand,
    requestId: string,
    options: MovementExecutionOptions = {},
  ): Promise<MovementWithRelations> {
    if (command.idempotencyKey) {
      const existing = await tx.stockMovement.findUnique({
        where: {
          companyId_idempotencyKey: {
            companyId: identity.companyId,
            idempotencyKey: command.idempotencyKey,
          },
        },
        include: movementInclude,
      });
      if (existing) {
        if (this.sameCommand(existing, command)) return existing;
        throw new ConflictException({
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'Chave de idempotência já utilizada com outros dados.',
        });
      }
    }
    const product = await tx.product.findFirst({
      where: { id: command.productId, companyId: identity.companyId },
    });
    if (!product)
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    if (!product.isActive && !options.allowInactiveProduct)
      throw new UnprocessableEntityException({
        code: 'PRODUCT_INACTIVE',
        message: 'Produto inativo não pode ser movimentado.',
      });
    const locationIds = [command.sourceLocationId, command.destinationLocationId].filter(
      (id): id is string => Boolean(id),
    );
    const locations = await tx.stockLocation.findMany({
      where: {
        id: { in: locationIds },
        companyId: identity.companyId,
      },
      select: {
        id: true,
        isActive: true,
        warehouseId: true,
        warehouse: { select: { isActive: true } },
      },
    });
    if (locations.length !== locationIds.length)
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Produto ou endereço não encontrado.',
      });
    if (locations.some((location) => !location.isActive))
      throw new UnprocessableEntityException({
        code: 'LOCATION_INACTIVE',
        message: 'Endereço inativo não pode receber movimentações.',
      });
    if (locations.some((location) => !location.warehouse.isActive))
      throw new UnprocessableEntityException({
        code: 'WAREHOUSE_INACTIVE',
        message: 'Depósito inativo não pode receber movimentações.',
      });
    if (!options.bypassInventoryLock) {
      const activeInventory = await tx.inventoryCount.findFirst({
        where: {
          companyId: identity.companyId,
          warehouseId: { in: [...new Set(locations.map((location) => location.warehouseId))] },
          status: {
            in: [
              InventoryCountStatus.IN_PROGRESS,
              InventoryCountStatus.RECOUNT_REQUIRED,
              InventoryCountStatus.READY_FOR_APPROVAL,
            ],
          },
        },
        select: { id: true },
      });
      if (activeInventory)
        throw new UnprocessableEntityException({
          code: 'LOCATION_UNDER_INVENTORY',
          message: 'O endereço está bloqueado por um inventário físico ativo.',
        });
    }
    const quantity = new Prisma.Decimal(command.quantity);
    if (command.sourceLocationId) {
      const balances = await tx.$queryRaw<{ id: string; quantity: Prisma.Decimal }[]>`
        SELECT "id", "quantity" FROM "InventoryBalance"
        WHERE "companyId" = ${identity.companyId}::uuid
          AND "productId" = ${command.productId}::uuid
          AND "locationId" = ${command.sourceLocationId}::uuid
        FOR UPDATE
      `;
      if (!balances.length)
        throw new UnprocessableEntityException({
          code: 'INSUFFICIENT_STOCK',
          message: 'Saldo insuficiente no endereço de origem.',
        });
      const reservation = await tx.stockReservation.aggregate({
        where: {
          companyId: identity.companyId,
          productId: command.productId,
          locationId: command.sourceLocationId,
          status: StockReservationStatus.ACTIVE,
        },
        _sum: { quantity: true },
      });
      const activeReserved = reservation._sum.quantity ?? this.zero();
      const protectedReserved = activeReserved.sub(options.reservationAllowance ?? this.zero());
      const remaining = balances[0].quantity.sub(quantity);
      if (remaining.lt(0) || remaining.lt(protectedReserved)) {
        throw new UnprocessableEntityException({
          code: options.reservationAllowance
            ? 'RESERVED_STOCK_INCONSISTENCY'
            : 'INSUFFICIENT_AVAILABLE_STOCK',
          message: options.reservationAllowance
            ? 'O saldo físico não comporta o consumo das reservas.'
            : 'O saldo disponível é insuficiente; parte do estoque está reservada.',
        });
      }
      await tx.inventoryBalance.update({
        where: { id: balances[0].id },
        data: { quantity: { decrement: quantity } },
      });
    }
    if (command.destinationLocationId) {
      await tx.inventoryBalance.upsert({
        where: {
          companyId_productId_locationId: {
            companyId: identity.companyId,
            productId: command.productId,
            locationId: command.destinationLocationId,
          },
        },
        update: { quantity: { increment: quantity } },
        create: {
          companyId: identity.companyId,
          productId: command.productId,
          locationId: command.destinationLocationId,
          quantity,
        },
      });
    }
    const movement = await tx.stockMovement.create({
      data: {
        companyId: identity.companyId,
        productId: command.productId,
        type: command.type,
        quantity,
        sourceLocationId: command.sourceLocationId,
        destinationLocationId: command.destinationLocationId,
        reason: command.reason?.trim() || null,
        referenceType: options.referenceType ?? 'MANUAL',
        referenceId: options.referenceId ?? null,
        idempotencyKey: command.idempotencyKey?.trim() || null,
        performedByUserId: identity.userId,
      },
      include: movementInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId: identity.userId,
        companyId: identity.companyId,
        entity: 'StockMovement',
        entityId: movement.id,
        action: `inventory.${command.type.toLowerCase()}`,
        after: {
          productId: command.productId,
          quantity: command.quantity,
          sourceLocationId: command.sourceLocationId,
          destinationLocationId: command.destinationLocationId,
          reason: command.reason,
          referenceType: options.referenceType ?? 'MANUAL',
          referenceId: options.referenceId,
        },
        requestId,
      },
    });
    return movement;
  }

  private sameCommand(movement: MovementWithRelations, command: MovementCommand) {
    return (
      movement.type === command.type &&
      movement.productId === command.productId &&
      movement.quantity.equals(command.quantity) &&
      movement.sourceLocationId === (command.sourceLocationId ?? null) &&
      movement.destinationLocationId === (command.destinationLocationId ?? null) &&
      movement.reason === (command.reason?.trim() || null)
    );
  }

  private toMovement(movement: MovementWithRelations) {
    return {
      id: movement.id,
      type: movement.type,
      quantity: movement.quantity.toFixed(4),
      product: movement.product,
      sourceLocation: movement.sourceLocation,
      destinationLocation: movement.destinationLocation,
      reason: movement.reason,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      performedBy: movement.performedBy,
      createdAt: movement.createdAt.toISOString(),
    };
  }

  private toBalance(
    balance: Prisma.InventoryBalanceGetPayload<{ include: typeof balanceInclude }>,
    reservedQuantity: Prisma.Decimal,
  ) {
    return {
      id: balance.id,
      quantity: balance.quantity.toFixed(4),
      reservedQuantity: reservedQuantity.toFixed(4),
      availableQuantity: balance.quantity.sub(reservedQuantity).toFixed(4),
      product: { ...balance.product, minimumStock: balance.product.minimumStock.toFixed(3) },
      location: balance.location,
      createdAt: balance.createdAt.toISOString(),
      updatedAt: balance.updatedAt.toISOString(),
    };
  }

  private async activeReservedByBalance(
    companyId: string,
    balances: Array<{ productId: string; locationId: string }>,
  ) {
    if (!balances.length) return new Map<string, Prisma.Decimal>();
    const productIds = [...new Set(balances.map((item) => item.productId))];
    const locationIds = [...new Set(balances.map((item) => item.locationId))];
    const grouped = await this.prisma.stockReservation.groupBy({
      by: ['productId', 'locationId'],
      where: {
        companyId,
        productId: { in: productIds },
        locationId: { in: locationIds },
        status: StockReservationStatus.ACTIVE,
      },
      _sum: { quantity: true },
    });
    return new Map(
      grouped.map((item) => [this.balanceKey(item), item._sum.quantity ?? this.zero()]),
    );
  }

  private balanceKey(value: { productId: string; locationId: string }) {
    return `${value.productId}:${value.locationId}`;
  }

  private zero() {
    return new Prisma.Decimal(0);
  }
}
