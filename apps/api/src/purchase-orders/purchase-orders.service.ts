import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  ListPurchaseOrdersQueryDto,
  PurchaseOrderItemInputDto,
  PurchaseOrderOptionsQueryDto,
  PurchaseOrderResponseDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';

const orderInclude = {
  supplier: { select: { id: true, name: true, document: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.PurchaseOrderInclude;

type OrderWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof orderInclude }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(identity: AuthenticatedUser, query: ListPurchaseOrdersQueryDto) {
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId: identity.companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: this.startOfDay(query.startDate) } : {}),
              ...(query.endDate ? { lt: this.nextDay(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.expectedDeliveryFrom || query.expectedDeliveryTo
        ? {
            expectedDeliveryDate: {
              ...(query.expectedDeliveryFrom
                ? { gte: this.startOfDay(query.expectedDeliveryFrom) }
                : {}),
              ...(query.expectedDeliveryTo ? { lt: this.nextDay(query.expectedDeliveryTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
              { items: { some: { productName: { contains: query.search, mode: 'insensitive' } } } },
              { items: { some: { productSku: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: orderInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return {
      data: orders.map((order) => this.toResponse(order)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async options(identity: AuthenticatedUser, query: PurchaseOrderOptionsQueryDto) {
    const [suppliers, warehouses, products] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where: { companyId: identity.companyId, isActive: true },
        select: { id: true, name: true, document: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.prisma.warehouse.findMany({
        where: { companyId: identity.companyId, isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.prisma.product.findMany({
        where: {
          companyId: identity.companyId,
          isActive: true,
          ...(query.productSearch
            ? {
                OR: [
                  { name: { contains: query.productSearch, mode: 'insensitive' as const } },
                  { sku: { contains: query.productSearch, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          sku: true,
          costPrice: true,
          unit: { select: { symbol: true } },
        },
        orderBy: { name: 'asc' },
        take: 25,
      }),
    ]);
    return {
      suppliers,
      warehouses,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unitSymbol: product.unit.symbol,
        suggestedUnitCost: product.costPrice.toFixed(2),
      })),
    };
  }

  async create(identity: AuthenticatedUser, dto: CreatePurchaseOrderDto, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureHeaderReferences(tx, identity.companyId, dto.supplierId, dto.warehouseId);
      const items = await this.prepareItems(tx, identity.companyId, dto.items);
      const totals = this.calculateTotals(dto, items);
      const sequence = await tx.$queryRaw<{ lastNumber: number }[]>`
        INSERT INTO "PurchaseOrderSequence" ("companyId", "lastNumber", "updatedAt")
        VALUES (${identity.companyId}::uuid, 1, NOW())
        ON CONFLICT ("companyId") DO UPDATE
        SET "lastNumber" = "PurchaseOrderSequence"."lastNumber" + 1, "updatedAt" = NOW()
        RETURNING "lastNumber"
      `;
      const number = `PO-${String(sequence[0].lastNumber).padStart(6, '0')}`;
      const created = await tx.purchaseOrder.create({
        data: {
          companyId: identity.companyId,
          supplierId: dto.supplierId,
          warehouseId: dto.warehouseId,
          number,
          expectedDeliveryDate: this.dateOrNull(dto.expectedDeliveryDate),
          notes: this.textOrNull(dto.notes),
          ...totals,
          createdByUserId: identity.userId,
        },
      });
      await tx.purchaseOrderItem.createMany({
        data: items.map((item) => ({ ...item, purchaseOrderId: created.id })),
      });
      const order = await this.getScoped(tx, identity.companyId, created.id);
      await this.audit(tx, identity, order, 'PURCHASE_ORDER_CREATED', requestId, null, {
        supplierId: order.supplierId,
        warehouseId: order.warehouseId,
        totalAmount: order.totalAmount.toFixed(2),
      });
      return this.toResponse(order);
    });
  }

  async findOne(identity: AuthenticatedUser, id: string) {
    return this.toResponse(await this.getScoped(this.prisma, identity.companyId, id));
  }

  async update(
    identity: AuthenticatedUser,
    id: string,
    dto: UpdatePurchaseOrderDto,
    requestId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.getScoped(tx, identity.companyId, id);
      if (current.status !== PurchaseOrderStatus.DRAFT) this.notEditable(current.status);

      const merged = {
        supplierId: dto.supplierId ?? current.supplierId,
        warehouseId: dto.warehouseId ?? current.warehouseId,
        expectedDeliveryDate:
          dto.expectedDeliveryDate !== undefined
            ? dto.expectedDeliveryDate
            : current.expectedDeliveryDate?.toISOString().slice(0, 10),
        notes: dto.notes !== undefined ? dto.notes : current.notes,
        discountAmount: dto.discountAmount ?? current.discountAmount.toFixed(2),
        freightAmount: dto.freightAmount ?? current.freightAmount.toFixed(2),
        otherAmount: dto.otherAmount ?? current.otherAmount.toFixed(2),
        items:
          dto.items ??
          current.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity.toFixed(4),
            unitCost: item.unitCost.toFixed(2),
          })),
      };
      await this.ensureHeaderReferences(
        tx,
        identity.companyId,
        merged.supplierId,
        merged.warehouseId,
      );
      const items = await this.prepareItems(tx, identity.companyId, merged.items);
      const totals = this.calculateTotals(merged, items);
      const claimed = await tx.purchaseOrder.updateMany({
        where: { id, companyId: identity.companyId, status: PurchaseOrderStatus.DRAFT },
        data: {
          supplierId: merged.supplierId,
          warehouseId: merged.warehouseId,
          expectedDeliveryDate: this.dateOrNull(merged.expectedDeliveryDate),
          notes: this.textOrNull(merged.notes),
          ...totals,
        },
      });
      if (claimed.count !== 1) this.concurrentTransition();
      await tx.purchaseOrderItem.deleteMany({
        where: { companyId: identity.companyId, purchaseOrderId: id },
      });
      await tx.purchaseOrderItem.createMany({
        data: items.map((item) => ({
          ...item,
          companyId: identity.companyId,
          purchaseOrderId: id,
        })),
      });
      const order = await this.getScoped(tx, identity.companyId, id);
      await this.audit(
        tx,
        identity,
        order,
        'PURCHASE_ORDER_UPDATED',
        requestId,
        {
          supplierId: current.supplierId,
          warehouseId: current.warehouseId,
          totalAmount: current.totalAmount.toFixed(2),
        },
        {
          supplierId: order.supplierId,
          warehouseId: order.warehouseId,
          totalAmount: order.totalAmount.toFixed(2),
          changedFields: Object.keys(dto),
        },
      );
      return this.toResponse(order);
    });
  }

  async submit(identity: AuthenticatedUser, id: string, requestId: string) {
    return this.transition(
      identity,
      id,
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.PENDING_APPROVAL,
      'PURCHASE_ORDER_SUBMITTED',
      requestId,
    );
  }

  async approve(identity: AuthenticatedUser, id: string, requestId: string) {
    return this.transition(
      identity,
      id,
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.APPROVED,
      'PURCHASE_ORDER_APPROVED',
      requestId,
      {
        approvedByUserId: identity.userId,
        approvedAt: new Date(),
      },
    );
  }

  async cancel(identity: AuthenticatedUser, id: string, reason: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.getScoped(tx, identity.companyId, id);
      const cancellableStatuses: PurchaseOrderStatus[] = [
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.PENDING_APPROVAL,
        PurchaseOrderStatus.APPROVED,
      ];
      if (!cancellableStatuses.includes(current.status)) {
        throw new ConflictException({
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Este pedido não pode ser cancelado.',
        });
      }
      const changed = await tx.purchaseOrder.updateMany({
        where: { id, companyId: identity.companyId, status: current.status },
        data: {
          status: PurchaseOrderStatus.CANCELLED,
          cancelledByUserId: identity.userId,
          cancelledAt: new Date(),
          cancellationReason: reason.trim(),
        },
      });
      if (changed.count !== 1) this.concurrentTransition();
      const order = await this.getScoped(tx, identity.companyId, id);
      await this.audit(
        tx,
        identity,
        order,
        'PURCHASE_ORDER_CANCELLED',
        requestId,
        { status: current.status },
        { status: order.status, reason: reason.trim() },
      );
      return this.toResponse(order);
    });
  }

  private async transition(
    identity: AuthenticatedUser,
    id: string,
    from: PurchaseOrderStatus,
    to: PurchaseOrderStatus,
    action: string,
    requestId: string,
    data: Prisma.PurchaseOrderUncheckedUpdateManyInput = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.getScoped(tx, identity.companyId, id);
      if (current.status !== from) {
        const code =
          current.status === PurchaseOrderStatus.CANCELLED
            ? 'PURCHASE_ORDER_CANCELLED'
            : current.status === PurchaseOrderStatus.APPROVED
              ? 'PURCHASE_ORDER_ALREADY_APPROVED'
              : 'INVALID_STATUS_TRANSITION';
        throw new ConflictException({ code, message: 'Transição de estado não permitida.' });
      }
      if (from === PurchaseOrderStatus.DRAFT && current.items.length === 0) {
        throw new UnprocessableEntityException({
          code: 'PURCHASE_ORDER_EMPTY',
          message: 'O pedido deve possuir ao menos um item.',
        });
      }
      const changed = await tx.purchaseOrder.updateMany({
        where: { id, companyId: identity.companyId, status: from },
        data: { ...data, status: to },
      });
      if (changed.count !== 1) this.concurrentTransition();
      const order = await this.getScoped(tx, identity.companyId, id);
      await this.audit(tx, identity, order, action, requestId, { status: from }, { status: to });
      return this.toResponse(order);
    });
  }

  private async prepareItems(tx: Tx, companyId: string, inputs: PurchaseOrderItemInputDto[]) {
    if (!inputs.length)
      throw new UnprocessableEntityException({
        code: 'PURCHASE_ORDER_EMPTY',
        message: 'O pedido deve possuir ao menos um item.',
      });
    const ids = inputs.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      throw new ConflictException({
        code: 'DUPLICATE_PRODUCT',
        message: 'Um produto não pode aparecer duas vezes no pedido.',
      });
    }
    const products = await tx.product.findMany({
      where: { companyId, id: { in: ids } },
      select: {
        id: true,
        name: true,
        sku: true,
        costPrice: true,
        isActive: true,
        unit: { select: { symbol: true } },
      },
    });
    if (products.length !== ids.length)
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    const byId = new Map(products.map((product) => [product.id, product]));
    const items = inputs.map((input) => {
      const product = byId.get(input.productId)!;
      if (!product.isActive)
        throw new UnprocessableEntityException({
          code: 'PRODUCT_INACTIVE',
          message: `O produto ${product.name} está inativo.`,
        });
      const quantity = new Prisma.Decimal(input.quantity);
      const unitCost = new Prisma.Decimal(input.unitCost);
      if (quantity.lte(0))
        throw new UnprocessableEntityException({
          code: 'INVALID_QUANTITY',
          message: 'A quantidade deve ser maior que zero.',
        });
      if (unitCost.lt(0))
        throw new UnprocessableEntityException({
          code: 'INVALID_UNIT_COST',
          message: 'O custo não pode ser negativo.',
        });
      return {
        companyId,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitSymbol: product.unit.symbol,
        quantity,
        unitCost,
        subtotal: quantity.mul(unitCost).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
        receivedQuantity: new Prisma.Decimal(0),
      };
    });
    return items;
  }

  private calculateTotals(
    dto: Pick<CreatePurchaseOrderDto, 'discountAmount' | 'freightAmount' | 'otherAmount'>,
    items: Array<{ subtotal: Prisma.Decimal }>,
  ) {
    const subtotal = items.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));
    const discountAmount = new Prisma.Decimal(dto.discountAmount ?? '0');
    const freightAmount = new Prisma.Decimal(dto.freightAmount ?? '0');
    const otherAmount = new Prisma.Decimal(dto.otherAmount ?? '0');
    const totalAmount = subtotal.sub(discountAmount).add(freightAmount).add(otherAmount);
    if (totalAmount.lt(0))
      throw new UnprocessableEntityException({
        code: 'INVALID_TOTAL',
        message: 'O total do pedido não pode ser negativo.',
      });
    return { subtotal, discountAmount, freightAmount, otherAmount, totalAmount };
  }

  private async getScoped(
    client: Tx | PrismaService,
    companyId: string,
    id: string,
  ): Promise<OrderWithRelations> {
    const order = await client.purchaseOrder.findFirst({
      where: { id, companyId },
      include: orderInclude,
    });
    if (!order)
      throw new NotFoundException({
        code: 'PURCHASE_ORDER_NOT_FOUND',
        message: 'Pedido de compra não encontrado.',
      });
    return order;
  }

  private async ensureHeaderReferences(
    tx: Tx,
    companyId: string,
    supplierId: string,
    warehouseId: string,
  ) {
    const [supplier, warehouse] = await Promise.all([
      tx.supplier.findFirst({ where: { id: supplierId, companyId } }),
      tx.warehouse.findFirst({ where: { id: warehouseId, companyId } }),
    ]);
    if (!supplier)
      throw new NotFoundException({
        code: 'SUPPLIER_NOT_FOUND',
        message: 'Fornecedor não encontrado.',
      });
    if (!supplier.isActive)
      throw new UnprocessableEntityException({
        code: 'SUPPLIER_INACTIVE',
        message: 'O fornecedor está inativo.',
      });
    if (!warehouse)
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Depósito não encontrado.',
      });
    if (!warehouse.isActive)
      throw new UnprocessableEntityException({
        code: 'WAREHOUSE_INACTIVE',
        message: 'O depósito está inativo.',
      });
  }

  private async audit(
    tx: Tx,
    identity: AuthenticatedUser,
    order: OrderWithRelations,
    action: string,
    requestId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown>,
  ) {
    await tx.auditLog.create({
      data: {
        companyId: identity.companyId,
        actorId: identity.userId,
        entity: 'PurchaseOrder',
        entityId: order.id,
        action,
        before: before ? (before as Prisma.InputJsonObject) : Prisma.JsonNull,
        after: {
          orderId: order.id,
          number: order.number,
          supplierId: order.supplierId,
          totalAmount: order.totalAmount.toFixed(2),
          ...after,
        } as Prisma.InputJsonObject,
        requestId,
      },
    });
  }

  private notEditable(status: PurchaseOrderStatus): never {
    throw new ConflictException({
      code:
        status === PurchaseOrderStatus.CANCELLED
          ? 'PURCHASE_ORDER_CANCELLED'
          : 'PURCHASE_ORDER_NOT_EDITABLE',
      message: 'Somente pedidos em rascunho podem ser editados.',
    });
  }

  private concurrentTransition(): never {
    throw new ConflictException({
      code: 'PURCHASE_ORDER_CONCURRENT_CHANGE',
      message: 'O pedido foi alterado por outra operação. Atualize os dados.',
    });
  }

  private dateOrNull(value?: string | null) {
    return value ? this.startOfDay(value) : null;
  }
  private startOfDay(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  private nextDay(value: string) {
    const date = this.startOfDay(value);
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }
  private textOrNull(value?: string | null) {
    return value?.trim() || null;
  }

  private toResponse(order: OrderWithRelations): PurchaseOrderResponseDto {
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      supplier: order.supplier,
      warehouse: order.warehouse,
      expectedDeliveryDate: order.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
      notes: order.notes,
      subtotal: order.subtotal.toFixed(2),
      discountAmount: order.discountAmount.toFixed(2),
      freightAmount: order.freightAmount.toFixed(2),
      otherAmount: order.otherAmount.toFixed(2),
      totalAmount: order.totalAmount.toFixed(2),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        unitSymbol: item.unitSymbol,
        quantity: item.quantity.toFixed(4),
        unitCost: item.unitCost.toFixed(2),
        subtotal: item.subtotal.toFixed(2),
        receivedQuantity: item.receivedQuantity.toFixed(4),
      })),
      createdBy: order.createdBy,
      approvedBy: order.approvedBy,
      cancelledBy: order.cancelledBy,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      approvedAt: order.approvedAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      cancellationReason: order.cancellationReason,
    };
  }
}
