import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseReceiptDto,
  ListPurchaseReceiptsQueryDto,
  PurchaseReceiptResponseDto,
} from './dto/purchase-receipt.dto';

const receiptInclude = {
  purchaseOrder: {
    select: {
      id: true,
      number: true,
      status: true,
      supplier: { select: { id: true, name: true, document: true } },
      warehouse: { select: { id: true, name: true, code: true } },
    },
  },
  receivedBy: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      purchaseOrderItem: {
        select: { productName: true, productSku: true, unitSymbol: true },
      },
      location: {
        select: {
          id: true,
          code: true,
          description: true,
          zone: true,
          aisle: true,
          rack: true,
          level: true,
          position: true,
          warehouse: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.PurchaseReceiptInclude;

type ReceiptWithRelations = Prisma.PurchaseReceiptGetPayload<{ include: typeof receiptInclude }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class PurchaseReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async findAll(identity: AuthenticatedUser, query: ListPurchaseReceiptsQueryDto) {
    const where: Prisma.PurchaseReceiptWhereInput = {
      companyId: identity.companyId,
      ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
      ...(query.supplierId ? { purchaseOrder: { supplierId: query.supplierId } } : {}),
      ...(query.warehouseId ? { purchaseOrder: { warehouseId: query.warehouseId } } : {}),
      ...(query.startDate || query.endDate
        ? {
            receivedAt: {
              ...(query.startDate ? { gte: this.startOfDay(query.startDate) } : {}),
              ...(query.endDate ? { lt: this.nextDay(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { purchaseOrder: { number: { contains: query.search, mode: 'insensitive' } } },
              {
                purchaseOrder: {
                  supplier: { name: { contains: query.search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };
    const [receipts, total] = await this.prisma.$transaction([
      this.prisma.purchaseReceipt.findMany({
        where,
        include: receiptInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.purchaseReceipt.count({ where }),
    ]);
    return {
      data: receipts.map((receipt) => this.toResponse(receipt)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(identity: AuthenticatedUser, id: string) {
    const receipt = await this.prisma.purchaseReceipt.findFirst({
      where: { id, companyId: identity.companyId },
      include: receiptInclude,
    });
    if (!receipt) this.receiptNotFound();
    return this.toResponse(receipt);
  }

  async options(identity: AuthenticatedUser) {
    const [suppliers, warehouses] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where: { companyId: identity.companyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.prisma.warehouse.findMany({
        where: { companyId: identity.companyId },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
    ]);
    return { suppliers, warehouses };
  }

  async getReceivable(identity: AuthenticatedUser, purchaseOrderId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, companyId: identity.companyId },
      include: {
        supplier: { select: { id: true, name: true, document: true, isActive: true } },
        warehouse: { select: { id: true, name: true, code: true, isActive: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) this.orderNotFound();
    this.ensureReceivableStatus(order.status);
    if (!order.warehouse.isActive) this.warehouseInactive();
    const locations = await this.prisma.stockLocation.findMany({
      where: {
        companyId: identity.companyId,
        warehouseId: order.warehouseId,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        description: true,
        zone: true,
        aisle: true,
        rack: true,
        level: true,
        position: true,
      },
      orderBy: { code: 'asc' },
    });
    return {
      orderId: order.id,
      number: order.number,
      status: order.status,
      supplier: order.supplier,
      warehouse: order.warehouse,
      expectedDeliveryDate: order.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        unitSymbol: item.unitSymbol,
        orderedQuantity: item.quantity.toFixed(4),
        receivedQuantity: item.receivedQuantity.toFixed(4),
        pendingQuantity: item.quantity.sub(item.receivedQuantity).toFixed(4),
        unitCost: item.unitCost.toFixed(2),
      })),
      locations,
    };
  }

  async create(identity: AuthenticatedUser, dto: CreatePurchaseReceiptDto, requestId: string) {
    const requestHash = this.requestHash(dto);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (tx) => this.createTransaction(tx, identity, dto, requestHash, requestId),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        ) {
          continue;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const existing = await this.findByIdempotency(identity.companyId, dto.idempotencyKey);
          if (existing) return this.resolveIdempotency(existing, requestHash);
        }
        throw error;
      }
    }
    throw new ConflictException({
      code: 'PURCHASE_RECEIPT_CONCURRENCY_CONFLICT',
      message: 'O pedido foi recebido por outra operação. Atualize os dados e tente novamente.',
    });
  }

  private async createTransaction(
    tx: Tx,
    identity: AuthenticatedUser,
    dto: CreatePurchaseReceiptDto,
    requestHash: string,
    requestId: string,
  ) {
    const existing = await tx.purchaseReceipt.findUnique({
      where: {
        companyId_idempotencyKey: {
          companyId: identity.companyId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
      include: receiptInclude,
    });
    if (existing) return this.resolveIdempotency(existing, requestHash);

    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "PurchaseOrder"
      WHERE "id" = ${dto.purchaseOrderId}::uuid
        AND "companyId" = ${identity.companyId}::uuid
      FOR UPDATE
    `;
    if (!locked.length) this.orderNotFound();

    const order = await tx.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, companyId: identity.companyId },
      include: {
        supplier: { select: { id: true, name: true, isActive: true } },
        warehouse: { select: { id: true, name: true, code: true, isActive: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) this.orderNotFound();
    this.ensureReceivableStatus(order.status);
    if (!order.warehouse.isActive) this.warehouseInactive();

    const itemIds = dto.items.map((item) => item.purchaseOrderItemId);
    if (new Set(itemIds).size !== itemIds.length) {
      throw new ConflictException({
        code: 'DUPLICATE_PURCHASE_ORDER_ITEM',
        message: 'Cada item do pedido pode aparecer somente uma vez no recebimento.',
      });
    }
    const orderItems = new Map(order.items.map((item) => [item.id, item]));
    const unknownItem = itemIds.some((id) => !orderItems.has(id));
    if (unknownItem) {
      throw new NotFoundException({
        code: 'PURCHASE_ORDER_ITEM_NOT_FOUND',
        message: 'Item do pedido não encontrado.',
      });
    }

    const locationIds = [...new Set(dto.items.map((item) => item.locationId))];
    const locations = await tx.stockLocation.findMany({
      where: { companyId: identity.companyId, id: { in: locationIds } },
      select: {
        id: true,
        warehouseId: true,
        isActive: true,
        warehouse: { select: { isActive: true } },
      },
    });
    if (locations.length !== locationIds.length) {
      throw new NotFoundException({
        code: 'LOCATION_NOT_FOUND',
        message: 'Endereço de estoque não encontrado.',
      });
    }
    const locationById = new Map(locations.map((location) => [location.id, location]));
    if (locations.some((location) => location.warehouseId !== order.warehouseId)) {
      throw new UnprocessableEntityException({
        code: 'LOCATION_NOT_ALLOWED',
        message: 'O endereço deve pertencer ao depósito do pedido.',
      });
    }
    if (locations.some((location) => !location.isActive)) {
      throw new UnprocessableEntityException({
        code: 'LOCATION_INACTIVE',
        message: 'Endereço inativo não pode receber mercadorias.',
      });
    }
    if (locations.some((location) => !location.warehouse.isActive)) this.warehouseInactive();

    const prepared = dto.items.map((input) => {
      const item = orderItems.get(input.purchaseOrderItemId)!;
      const received = new Prisma.Decimal(input.receivedQuantity);
      const pending = item.quantity.sub(item.receivedQuantity);
      if (received.lte(0)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_RECEIPT_QUANTITY',
          message: 'A quantidade recebida deve ser maior que zero.',
        });
      }
      if (received.gt(pending)) {
        throw new UnprocessableEntityException({
          code: 'RECEIPT_QUANTITY_EXCEEDS_PENDING',
          message: `A quantidade de ${item.productName} excede o saldo pendente.`,
        });
      }
      return {
        input,
        item,
        location: locationById.get(input.locationId)!,
        received,
        remaining: pending.sub(received),
      };
    });

    const sequence = await tx.$queryRaw<{ lastNumber: number }[]>`
      INSERT INTO "PurchaseReceiptSequence" ("companyId", "lastNumber", "updatedAt")
      VALUES (${identity.companyId}::uuid, 1, NOW())
      ON CONFLICT ("companyId") DO UPDATE
      SET "lastNumber" = "PurchaseReceiptSequence"."lastNumber" + 1, "updatedAt" = NOW()
      RETURNING "lastNumber"
    `;
    const number = `PR-${String(sequence[0].lastNumber).padStart(6, '0')}`;
    const receipt = await tx.purchaseReceipt.create({
      data: {
        companyId: identity.companyId,
        purchaseOrderId: order.id,
        number,
        notes: dto.notes?.trim() || null,
        receivedByUserId: identity.userId,
        idempotencyKey: dto.idempotencyKey,
        requestHash,
      },
    });

    await tx.purchaseReceiptItem.createMany({
      data: prepared.map(({ input, item, received, remaining }) => ({
        companyId: identity.companyId,
        purchaseReceiptId: receipt.id,
        purchaseOrderItemId: item.id,
        productId: item.productId,
        locationId: input.locationId,
        orderedQuantity: item.quantity,
        previouslyReceivedQuantity: item.receivedQuantity,
        receivedQuantity: received,
        remainingQuantity: remaining,
        unitCost: item.unitCost,
        discrepancyReason: input.discrepancyReason?.trim() || null,
      })),
    });

    for (const { item, input, received } of prepared) {
      const nextReceived = item.receivedQuantity.add(received);
      const updated = await tx.purchaseOrderItem.updateMany({
        where: {
          id: item.id,
          companyId: identity.companyId,
          purchaseOrderId: order.id,
          receivedQuantity: item.receivedQuantity,
          quantity: { gte: nextReceived },
        },
        data: { receivedQuantity: nextReceived },
      });
      if (updated.count !== 1) {
        throw new ConflictException({
          code: 'PURCHASE_RECEIPT_CONCURRENCY_CONFLICT',
          message: 'A quantidade pendente foi alterada por outro recebimento.',
        });
      }
      await this.inventoryService.applyPurchaseReceiptEntry(
        tx,
        identity,
        {
          purchaseReceiptId: receipt.id,
          productId: item.productId,
          locationId: input.locationId,
          quantity: received.toFixed(4),
          reason: `Recebimento ${number} do pedido ${order.number}`,
        },
        requestId,
      );
    }

    const receivedByItem = new Map(
      prepared.map(({ item, received }) => [item.id, item.receivedQuantity.add(received)]),
    );
    const complete = order.items.every((item) =>
      (receivedByItem.get(item.id) ?? item.receivedQuantity).equals(item.quantity),
    );
    const nextStatus = complete
      ? PurchaseOrderStatus.RECEIVED
      : PurchaseOrderStatus.PARTIALLY_RECEIVED;
    const orderChanged = await tx.purchaseOrder.updateMany({
      where: { id: order.id, companyId: identity.companyId, status: order.status },
      data: { status: nextStatus },
    });
    if (orderChanged.count !== 1) {
      throw new ConflictException({
        code: 'PURCHASE_RECEIPT_CONCURRENCY_CONFLICT',
        message: 'O estado do pedido foi alterado por outra operação.',
      });
    }

    await tx.auditLog.createMany({
      data: [
        {
          companyId: identity.companyId,
          actorId: identity.userId,
          entity: 'PurchaseReceipt',
          entityId: receipt.id,
          action: 'PURCHASE_RECEIPT_CREATED',
          after: {
            number,
            purchaseOrderId: order.id,
            itemCount: prepared.length,
            totalQuantity: prepared
              .reduce((sum, item) => sum.add(item.received), new Prisma.Decimal(0))
              .toFixed(4),
          },
          requestId,
        },
        {
          companyId: identity.companyId,
          actorId: identity.userId,
          entity: 'PurchaseOrder',
          entityId: order.id,
          action: complete ? 'PURCHASE_ORDER_RECEIVED' : 'PURCHASE_ORDER_PARTIALLY_RECEIVED',
          before: { status: order.status },
          after: { status: nextStatus, purchaseReceiptId: receipt.id, number },
          requestId,
        },
      ],
    });

    const created = await tx.purchaseReceipt.findUnique({
      where: { id: receipt.id },
      include: receiptInclude,
    });
    if (!created) this.receiptNotFound();
    return this.toResponse(created);
  }

  private async findByIdempotency(companyId: string, idempotencyKey: string) {
    return this.prisma.purchaseReceipt.findUnique({
      where: { companyId_idempotencyKey: { companyId, idempotencyKey } },
      include: receiptInclude,
    });
  }

  private resolveIdempotency(receipt: ReceiptWithRelations, requestHash: string) {
    if (receipt.requestHash !== requestHash) {
      throw new ConflictException({
        code: 'RECEIPT_DUPLICATE_REQUEST',
        message: 'A chave de idempotência já foi utilizada com outros dados.',
      });
    }
    return this.toResponse(receipt);
  }

  private requestHash(dto: CreatePurchaseReceiptDto) {
    const canonical = {
      purchaseOrderId: dto.purchaseOrderId,
      notes: dto.notes?.trim() || null,
      items: dto.items
        .map((item) => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          locationId: item.locationId,
          receivedQuantity: new Prisma.Decimal(item.receivedQuantity).toFixed(4),
          discrepancyReason: item.discrepancyReason?.trim() || null,
        }))
        .sort((a, b) => a.purchaseOrderItemId.localeCompare(b.purchaseOrderItemId)),
    };
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  private ensureReceivableStatus(status: PurchaseOrderStatus) {
    if (status === PurchaseOrderStatus.RECEIVED) {
      throw new ConflictException({
        code: 'PURCHASE_ORDER_ALREADY_RECEIVED',
        message: 'O pedido já foi integralmente recebido.',
      });
    }
    if (status === PurchaseOrderStatus.CANCELLED) {
      throw new ConflictException({
        code: 'PURCHASE_ORDER_CANCELLED',
        message: 'Pedido cancelado não pode ser recebido.',
      });
    }
    if (
      status !== PurchaseOrderStatus.APPROVED &&
      status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      throw new ConflictException({
        code: 'PURCHASE_ORDER_NOT_RECEIVABLE',
        message: 'Somente pedidos aprovados ou parcialmente recebidos podem ser recebidos.',
      });
    }
  }

  private warehouseInactive(): never {
    throw new UnprocessableEntityException({
      code: 'WAREHOUSE_INACTIVE',
      message: 'O depósito do pedido está inativo.',
    });
  }

  private orderNotFound(): never {
    throw new NotFoundException({
      code: 'PURCHASE_ORDER_NOT_FOUND',
      message: 'Pedido de compra não encontrado.',
    });
  }

  private receiptNotFound(): never {
    throw new NotFoundException({
      code: 'PURCHASE_RECEIPT_NOT_FOUND',
      message: 'Recebimento não encontrado.',
    });
  }

  private startOfDay(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private nextDay(value: string) {
    const date = this.startOfDay(value);
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  private toResponse(receipt: ReceiptWithRelations): PurchaseReceiptResponseDto {
    const totalQuantity = receipt.items.reduce(
      (sum, item) => sum.add(item.receivedQuantity),
      new Prisma.Decimal(0),
    );
    return {
      id: receipt.id,
      number: receipt.number,
      purchaseOrder: {
        id: receipt.purchaseOrder.id,
        name: receipt.purchaseOrder.number,
        number: receipt.purchaseOrder.number,
        status: receipt.purchaseOrder.status,
      },
      supplier: receipt.purchaseOrder.supplier,
      warehouse: receipt.purchaseOrder.warehouse,
      receivedAt: receipt.receivedAt.toISOString(),
      notes: receipt.notes,
      receivedBy: receipt.receivedBy,
      items: receipt.items.map((item) => ({
        id: item.id,
        purchaseOrderItemId: item.purchaseOrderItemId,
        product: {
          id: item.productId,
          name: item.purchaseOrderItem.productName,
          sku: item.purchaseOrderItem.productSku,
          unitSymbol: item.purchaseOrderItem.unitSymbol,
        },
        location: {
          ...item.location,
          name: item.location.code,
        },
        orderedQuantity: item.orderedQuantity.toFixed(4),
        previouslyReceivedQuantity: item.previouslyReceivedQuantity.toFixed(4),
        receivedQuantity: item.receivedQuantity.toFixed(4),
        remainingQuantity: item.remainingQuantity.toFixed(4),
        unitCost: item.unitCost.toFixed(2),
        discrepancyReason: item.discrepancyReason,
      })),
      itemCount: receipt.items.length,
      totalQuantity: totalQuantity.toFixed(4),
      createdAt: receipt.createdAt.toISOString(),
    };
  }
}
