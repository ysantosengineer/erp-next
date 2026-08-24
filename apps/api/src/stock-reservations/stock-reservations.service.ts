import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  InventoryCountStatus,
  Prisma,
  SalesOrderStatus,
  StockReservationStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListStockReservationsQueryDto, ShipSalesOrderDto } from './dto/stock-reservation.dto';

const reservationInclude = {
  salesOrder: { select: { id: true, number: true, status: true } },
  product: { select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } } },
  location: {
    select: {
      id: true,
      code: true,
      warehouse: { select: { id: true, name: true, code: true } },
    },
  },
  createdBy: { select: { id: true, name: true } },
  releasedBy: { select: { id: true, name: true } },
  consumedBy: { select: { id: true, name: true } },
} satisfies Prisma.StockReservationInclude;

const orderForStockInclude = {
  warehouse: { select: { id: true, name: true, code: true, isActive: true } },
  items: {
    include: { product: { select: { id: true, isActive: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SalesOrderInclude;

type ReservationWithRelations = Prisma.StockReservationGetPayload<{
  include: typeof reservationInclude;
}>;
type OrderForStock = Prisma.SalesOrderGetPayload<{ include: typeof orderForStockInclude }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class StockReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async findAll(identity: AuthenticatedUser, query: ListStockReservationsQueryDto) {
    const where: Prisma.StockReservationWhereInput = {
      companyId: identity.companyId,
      ...(query.salesOrderId ? { salesOrderId: query.salesOrderId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.warehouseId ? { location: { warehouseId: query.warehouseId } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lt: this.nextDay(query.endDate) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stockReservation.findMany({
        where,
        include: reservationInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockReservation.count({ where }),
    ]);
    return {
      data: rows.map((row) => this.toResponse(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(identity: AuthenticatedUser, id: string) {
    const reservation = await this.prisma.stockReservation.findFirst({
      where: { id, companyId: identity.companyId },
      include: reservationInclude,
    });
    if (!reservation) this.reservationNotFound();
    return this.toResponse(reservation);
  }

  reserve(identity: AuthenticatedUser, salesOrderId: string, requestId: string) {
    return this.serializable((tx) =>
      this.reserveTransaction(tx, identity, salesOrderId, requestId),
    );
  }

  release(identity: AuthenticatedUser, salesOrderId: string, requestId: string) {
    return this.serializable((tx) =>
      this.releaseTransaction(tx, identity, salesOrderId, requestId),
    );
  }

  ship(
    identity: AuthenticatedUser,
    salesOrderId: string,
    dto: ShipSalesOrderDto,
    requestId: string,
  ) {
    return this.serializable((tx) =>
      this.shipTransaction(tx, identity, salesOrderId, dto, requestId),
    );
  }

  async releaseForCancellation(
    tx: Tx,
    identity: AuthenticatedUser,
    order: Pick<OrderForStock, 'id' | 'companyId' | 'number' | 'status'>,
    requestId: string,
  ) {
    if (order.status !== SalesOrderStatus.RESERVED) return;
    const released = await tx.stockReservation.updateMany({
      where: {
        companyId: identity.companyId,
        salesOrderId: order.id,
        status: StockReservationStatus.ACTIVE,
      },
      data: {
        status: StockReservationStatus.RELEASED,
        releasedByUserId: identity.userId,
        releasedAt: new Date(),
      },
    });
    await tx.salesOrderItem.updateMany({
      where: { companyId: identity.companyId, salesOrderId: order.id },
      data: { reservedQuantity: 0 },
    });
    await this.audit(tx, identity, order, 'STOCK_RESERVATION_RELEASED', requestId, {
      reason: 'SALES_ORDER_CANCELLED',
      reservationCount: released.count,
    });
  }

  private async reserveTransaction(
    tx: Tx,
    identity: AuthenticatedUser,
    salesOrderId: string,
    requestId: string,
  ) {
    const order = await this.lockOrder(tx, identity.companyId, salesOrderId);
    if (order.status === SalesOrderStatus.RESERVED) return this.operationResponse(tx, order);
    if (order.status !== SalesOrderStatus.CONFIRMED) {
      throw new ConflictException({
        code: 'SALES_ORDER_NOT_RESERVABLE',
        message: 'Somente pedidos confirmados podem reservar estoque.',
      });
    }
    this.ensureOrderReferences(order);
    await this.ensureWarehouseAvailable(tx, identity.companyId, order.warehouseId);

    const productIds = [...new Set(order.items.map((item) => item.productId))].sort();
    for (const productId of productIds) {
      await tx.$queryRaw<{ id: string }[]>`
        SELECT ib."id" FROM "InventoryBalance" ib
        INNER JOIN "StockLocation" sl ON sl."id" = ib."locationId" AND sl."companyId" = ib."companyId"
        WHERE ib."companyId" = ${identity.companyId}::uuid
          AND ib."productId" = ${productId}::uuid
          AND sl."warehouseId" = ${order.warehouseId}::uuid
        ORDER BY ib."locationId"
        FOR UPDATE OF ib
      `;
    }

    const balances = await tx.inventoryBalance.findMany({
      where: {
        companyId: identity.companyId,
        productId: { in: productIds },
        location: {
          warehouseId: order.warehouseId,
          isActive: true,
          warehouse: { isActive: true },
        },
        quantity: { gt: 0 },
      },
      include: { location: { select: { id: true, code: true } } },
    });
    balances.sort(
      (a, b) =>
        a.location.code.localeCompare(b.location.code) || a.locationId.localeCompare(b.locationId),
    );
    const grouped = await tx.stockReservation.groupBy({
      by: ['productId', 'locationId'],
      where: {
        companyId: identity.companyId,
        productId: { in: productIds },
        locationId: { in: balances.map((balance) => balance.locationId) },
        status: StockReservationStatus.ACTIVE,
      },
      _sum: { quantity: true },
    });
    const reserved = new Map(
      grouped.map((item) => [
        this.balanceKey(item.productId, item.locationId),
        item._sum.quantity ?? this.zero(),
      ]),
    );
    const allocations: Array<{
      companyId: string;
      salesOrderId: string;
      salesOrderItemId: string;
      productId: string;
      locationId: string;
      quantity: Prisma.Decimal;
      createdByUserId: string;
    }> = [];

    for (const item of order.items) {
      let remaining = item.quantity;
      for (const balance of balances.filter((entry) => entry.productId === item.productId)) {
        if (remaining.lte(0)) break;
        const key = this.balanceKey(balance.productId, balance.locationId);
        const available = balance.quantity.sub(reserved.get(key) ?? this.zero());
        if (available.lte(0)) continue;
        const allocated = Prisma.Decimal.min(available, remaining);
        allocations.push({
          companyId: identity.companyId,
          salesOrderId: order.id,
          salesOrderItemId: item.id,
          productId: item.productId,
          locationId: balance.locationId,
          quantity: allocated,
          createdByUserId: identity.userId,
        });
        reserved.set(key, (reserved.get(key) ?? this.zero()).add(allocated));
        remaining = remaining.sub(allocated);
      }
      if (remaining.gt(0)) {
        throw new UnprocessableEntityException({
          code: 'INSUFFICIENT_AVAILABLE_STOCK',
          message: `Estoque disponível insuficiente para ${item.productName}.`,
          details: {
            salesOrderItemId: item.id,
            productId: item.productId,
            requestedQuantity: item.quantity.toFixed(4),
            missingQuantity: remaining.toFixed(4),
          },
        });
      }
    }

    await tx.stockReservation.createMany({ data: allocations });
    for (const item of order.items) {
      const changed = await tx.salesOrderItem.updateMany({
        where: {
          id: item.id,
          companyId: identity.companyId,
          salesOrderId: order.id,
          reservedQuantity: 0,
        },
        data: { reservedQuantity: item.quantity },
      });
      if (changed.count !== 1) this.concurrencyConflict();
    }
    const changed = await tx.salesOrder.updateMany({
      where: { id: order.id, companyId: identity.companyId, status: SalesOrderStatus.CONFIRMED },
      data: {
        status: SalesOrderStatus.RESERVED,
        reservedByUserId: identity.userId,
        reservedAt: new Date(),
      },
    });
    if (changed.count !== 1) this.concurrencyConflict();
    await this.audit(tx, identity, order, 'SALES_ORDER_STOCK_RESERVED', requestId, {
      allocationCount: allocations.length,
      totalQuantity: allocations
        .reduce((sum, allocation) => sum.add(allocation.quantity), this.zero())
        .toFixed(4),
    });
    return this.operationResponse(tx, order);
  }

  private async releaseTransaction(
    tx: Tx,
    identity: AuthenticatedUser,
    salesOrderId: string,
    requestId: string,
  ) {
    const order = await this.lockOrder(tx, identity.companyId, salesOrderId);
    if (order.status === SalesOrderStatus.CONFIRMED) {
      const releasedBefore = await tx.stockReservation.count({
        where: {
          companyId: identity.companyId,
          salesOrderId: order.id,
          status: StockReservationStatus.RELEASED,
        },
      });
      if (releasedBefore) return this.operationResponse(tx, order);
    }
    if (order.status !== SalesOrderStatus.RESERVED) {
      throw new ConflictException({
        code: 'SALES_ORDER_NOT_RELEASABLE',
        message: 'Somente pedidos reservados podem liberar estoque.',
      });
    }
    const released = await tx.stockReservation.updateMany({
      where: {
        companyId: identity.companyId,
        salesOrderId: order.id,
        status: StockReservationStatus.ACTIVE,
      },
      data: {
        status: StockReservationStatus.RELEASED,
        releasedByUserId: identity.userId,
        releasedAt: new Date(),
      },
    });
    if (!released.count) this.concurrencyConflict();
    await tx.salesOrderItem.updateMany({
      where: { companyId: identity.companyId, salesOrderId: order.id },
      data: { reservedQuantity: 0 },
    });
    const changed = await tx.salesOrder.updateMany({
      where: { id: order.id, companyId: identity.companyId, status: SalesOrderStatus.RESERVED },
      data: {
        status: SalesOrderStatus.CONFIRMED,
        reservedByUserId: null,
        reservedAt: null,
      },
    });
    if (changed.count !== 1) this.concurrencyConflict();
    await this.audit(tx, identity, order, 'STOCK_RESERVATION_RELEASED', requestId, {
      reason: 'MANUAL_RELEASE',
      reservationCount: released.count,
    });
    return this.operationResponse(tx, order);
  }

  private async shipTransaction(
    tx: Tx,
    identity: AuthenticatedUser,
    salesOrderId: string,
    dto: ShipSalesOrderDto,
    requestId: string,
  ) {
    const order = await this.lockOrder(tx, identity.companyId, salesOrderId);
    if (order.status === SalesOrderStatus.SHIPPED) return this.operationResponse(tx, order);
    if (order.status !== SalesOrderStatus.RESERVED) {
      throw new ConflictException({
        code: 'SALES_ORDER_NOT_SHIPPABLE',
        message: 'O pedido precisa estar totalmente reservado antes da baixa.',
      });
    }
    await this.ensureWarehouseAvailable(tx, identity.companyId, order.warehouseId);
    const reservations = await tx.stockReservation.findMany({
      where: {
        companyId: identity.companyId,
        salesOrderId: order.id,
        status: StockReservationStatus.ACTIVE,
      },
      orderBy: [{ productId: 'asc' }, { locationId: 'asc' }],
    });
    const reservedByItem = new Map<string, Prisma.Decimal>();
    for (const reservation of reservations) {
      reservedByItem.set(
        reservation.salesOrderItemId,
        (reservedByItem.get(reservation.salesOrderItemId) ?? this.zero()).add(reservation.quantity),
      );
    }
    if (
      !reservations.length ||
      order.items.some(
        (item) =>
          !(reservedByItem.get(item.id) ?? this.zero()).equals(item.quantity) ||
          !item.reservedQuantity.equals(item.quantity),
      )
    ) {
      throw new UnprocessableEntityException({
        code: 'RESERVED_STOCK_INCONSISTENCY',
        message: 'As reservas ativas não correspondem integralmente ao pedido.',
      });
    }

    for (const reservation of reservations) {
      await this.inventoryService.applySalesOrderShipmentExit(
        tx,
        identity,
        {
          salesOrderId: order.id,
          productId: reservation.productId,
          locationId: reservation.locationId,
          quantity: reservation.quantity.toFixed(4),
          reason: `Baixa do pedido ${order.number}`,
        },
        requestId,
      );
      const consumed = await tx.stockReservation.updateMany({
        where: {
          id: reservation.id,
          companyId: identity.companyId,
          status: StockReservationStatus.ACTIVE,
        },
        data: {
          status: StockReservationStatus.CONSUMED,
          consumedByUserId: identity.userId,
          consumedAt: new Date(),
        },
      });
      if (consumed.count !== 1) this.concurrencyConflict();
    }
    await tx.salesOrderItem.updateMany({
      where: { companyId: identity.companyId, salesOrderId: order.id },
      data: { reservedQuantity: 0 },
    });
    const changed = await tx.salesOrder.updateMany({
      where: { id: order.id, companyId: identity.companyId, status: SalesOrderStatus.RESERVED },
      data: {
        status: SalesOrderStatus.SHIPPED,
        shippedByUserId: identity.userId,
        shippedAt: new Date(),
        shipmentNotes: dto.notes?.trim() || null,
      },
    });
    if (changed.count !== 1) this.concurrencyConflict();
    await this.audit(tx, identity, order, 'SALES_ORDER_SHIPPED', requestId, {
      reservationCount: reservations.length,
      movementCount: reservations.length,
      notes: dto.notes?.trim() || null,
    });
    return this.operationResponse(tx, order);
  }

  private async serializable<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        ) {
          continue;
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 3
        ) {
          continue;
        }
        throw error;
      }
    }
    this.concurrencyConflict();
  }

  private async lockOrder(tx: Tx, companyId: string, id: string): Promise<OrderForStock> {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "SalesOrder"
      WHERE "id" = ${id}::uuid AND "companyId" = ${companyId}::uuid
      FOR UPDATE
    `;
    if (!locked.length) this.orderNotFound();
    const order = await tx.salesOrder.findFirst({
      where: { id, companyId },
      include: orderForStockInclude,
    });
    if (!order) this.orderNotFound();
    return order;
  }

  private ensureOrderReferences(order: OrderForStock) {
    if (!order.warehouse.isActive) {
      throw new UnprocessableEntityException({
        code: 'WAREHOUSE_INACTIVE',
        message: 'O depósito do pedido está inativo.',
      });
    }
    if (order.items.some((item) => !item.product.isActive)) {
      throw new UnprocessableEntityException({
        code: 'PRODUCT_INACTIVE',
        message: 'Um produto do pedido está inativo.',
      });
    }
  }

  private async ensureWarehouseAvailable(tx: Tx, companyId: string, warehouseId: string) {
    const activeInventory = await tx.inventoryCount.findFirst({
      where: {
        companyId,
        warehouseId,
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
    if (activeInventory) {
      throw new UnprocessableEntityException({
        code: 'LOCATION_UNDER_INVENTORY',
        message: 'O depósito está bloqueado por um inventário físico ativo.',
      });
    }
  }

  private async operationResponse(tx: Tx, order: OrderForStock) {
    const current = await tx.salesOrder.findFirst({
      where: { id: order.id, companyId: order.companyId },
      select: { id: true, number: true, status: true },
    });
    if (!current) this.orderNotFound();
    const reservations = await tx.stockReservation.findMany({
      where: { companyId: order.companyId, salesOrderId: order.id },
      include: reservationInclude,
      orderBy: [{ createdAt: 'asc' }, { locationId: 'asc' }],
    });
    return {
      orderId: current.id,
      number: current.number,
      status: current.status,
      reservations: reservations.map((reservation) => this.toResponse(reservation)),
    };
  }

  private async audit(
    tx: Tx,
    identity: AuthenticatedUser,
    order: Pick<OrderForStock, 'id' | 'companyId' | 'number' | 'status'>,
    action: string,
    requestId: string,
    after: Prisma.InputJsonObject,
  ) {
    await tx.auditLog.create({
      data: {
        companyId: identity.companyId,
        actorId: identity.userId,
        entity: 'SalesOrder',
        entityId: order.id,
        action,
        after: { salesOrderId: order.id, number: order.number, ...after },
        requestId,
      },
    });
  }

  private toResponse(reservation: ReservationWithRelations) {
    return {
      id: reservation.id,
      status: reservation.status,
      quantity: reservation.quantity.toFixed(4),
      salesOrder: reservation.salesOrder,
      salesOrderItemId: reservation.salesOrderItemId,
      product: {
        id: reservation.product.id,
        name: reservation.product.name,
        sku: reservation.product.sku,
        unitSymbol: reservation.product.unit.symbol,
      },
      location: reservation.location,
      createdBy: reservation.createdBy,
      releasedBy: reservation.releasedBy,
      consumedBy: reservation.consumedBy,
      createdAt: reservation.createdAt.toISOString(),
      releasedAt: reservation.releasedAt?.toISOString() ?? null,
      consumedAt: reservation.consumedAt?.toISOString() ?? null,
    };
  }

  private balanceKey(productId: string, locationId: string) {
    return `${productId}:${locationId}`;
  }

  private nextDay(value: string) {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  private zero() {
    return new Prisma.Decimal(0);
  }

  private orderNotFound(): never {
    throw new NotFoundException({
      code: 'SALES_ORDER_NOT_FOUND',
      message: 'Pedido de venda não encontrado.',
    });
  }

  private reservationNotFound(): never {
    throw new NotFoundException({
      code: 'RESERVATION_NOT_FOUND',
      message: 'Reserva de estoque não encontrada.',
    });
  }

  private concurrencyConflict(): never {
    throw new ConflictException({
      code: 'STOCK_RESERVATION_CONCURRENCY_CONFLICT',
      message: 'O estoque ou pedido foi alterado por outra operação. Tente novamente.',
    });
  }
}
