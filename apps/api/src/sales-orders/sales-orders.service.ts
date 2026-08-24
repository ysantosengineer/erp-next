import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, SalesOrderStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { StockReservationsService } from '../stock-reservations/stock-reservations.service';
import {
  CreateSalesOrderDto,
  ListSalesOrdersQueryDto,
  SalesOrderItemInputDto,
  SalesOrderOptionsQueryDto,
  SalesOrderResponseDto,
  UpdateSalesOrderDto,
} from './dto/sales-order.dto';

const orderInclude = {
  customer: { select: { id: true, name: true, document: true, creditLimit: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true } },
  confirmedBy: { select: { id: true, name: true } },
  reservedBy: { select: { id: true, name: true } },
  shippedBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
  items: {
    include: {
      reservations: {
        include: {
          location: {
            select: {
              id: true,
              code: true,
              warehouse: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SalesOrderInclude;

type OrderWithRelations = Prisma.SalesOrderGetPayload<{ include: typeof orderInclude }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockReservationsService: StockReservationsService,
  ) {}

  async findAll(identity: AuthenticatedUser, query: ListSalesOrdersQueryDto) {
    const where: Prisma.SalesOrderWhereInput = {
      companyId: identity.companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.startDate || query.endDate
        ? {
            orderDate: {
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
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { items: { some: { productName: { contains: query.search, mode: 'insensitive' } } } },
              { items: { some: { productSku: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        include: orderInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.salesOrder.count({ where }),
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

  async options(identity: AuthenticatedUser, query: SalesOrderOptionsQueryDto) {
    const [customers, warehouses, products] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where: { companyId: identity.companyId, isActive: true },
        select: { id: true, name: true, document: true, creditLimit: true },
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
          salePrice: true,
          unit: { select: { symbol: true } },
        },
        orderBy: { name: 'asc' },
        take: 25,
      }),
    ]);
    return {
      customers: customers.map((customer) => ({
        ...customer,
        creditLimit: customer.creditLimit.toFixed(2),
      })),
      warehouses,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unitSymbol: product.unit.symbol,
        suggestedUnitPrice: product.salePrice.toFixed(2),
      })),
    };
  }

  async create(identity: AuthenticatedUser, dto: CreateSalesOrderDto, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureHeaderReferences(tx, identity.companyId, dto.customerId, dto.warehouseId);
      const items = await this.prepareItems(tx, identity.companyId, dto.items);
      const totals = this.calculateTotals(dto, items);
      const sequence = await tx.$queryRaw<{ lastNumber: number }[]>`
        INSERT INTO "SalesOrderSequence" ("companyId", "lastNumber", "updatedAt")
        VALUES (${identity.companyId}::uuid, 1, NOW())
        ON CONFLICT ("companyId") DO UPDATE
        SET "lastNumber" = "SalesOrderSequence"."lastNumber" + 1, "updatedAt" = NOW()
        RETURNING "lastNumber"
      `;
      const number = `SO-${String(sequence[0].lastNumber).padStart(6, '0')}`;
      const created = await tx.salesOrder.create({
        data: {
          companyId: identity.companyId,
          customerId: dto.customerId,
          warehouseId: dto.warehouseId,
          number,
          orderDate: dto.orderDate ? this.startOfDay(dto.orderDate) : this.today(),
          expectedDeliveryDate: this.dateOrNull(dto.expectedDeliveryDate),
          notes: this.textOrNull(dto.notes),
          ...totals,
          createdByUserId: identity.userId,
        },
      });
      await tx.salesOrderItem.createMany({
        data: items.map((item) => ({ ...item, salesOrderId: created.id })),
      });
      const order = await this.getScoped(tx, identity.companyId, created.id);
      await this.audit(tx, identity, order, 'SALES_ORDER_CREATED', requestId, null, {
        customerId: order.customerId,
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
    dto: UpdateSalesOrderDto,
    requestId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.getScoped(tx, identity.companyId, id);
      if (current.status !== SalesOrderStatus.DRAFT) this.notEditable(current.status);
      const merged = {
        customerId: dto.customerId ?? current.customerId,
        warehouseId: dto.warehouseId ?? current.warehouseId,
        orderDate: dto.orderDate ?? current.orderDate.toISOString().slice(0, 10),
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
            unitPrice: item.unitPrice.toFixed(2),
            discountAmount: item.discountAmount.toFixed(2),
          })),
      };
      await this.ensureHeaderReferences(
        tx,
        identity.companyId,
        merged.customerId,
        merged.warehouseId,
      );
      const items = await this.prepareItems(tx, identity.companyId, merged.items);
      const totals = this.calculateTotals(merged, items);
      const changed = await tx.salesOrder.updateMany({
        where: { id, companyId: identity.companyId, status: SalesOrderStatus.DRAFT },
        data: {
          customerId: merged.customerId,
          warehouseId: merged.warehouseId,
          orderDate: this.startOfDay(merged.orderDate),
          expectedDeliveryDate: this.dateOrNull(merged.expectedDeliveryDate),
          notes: this.textOrNull(merged.notes),
          ...totals,
        },
      });
      if (changed.count !== 1) this.concurrentTransition();
      await tx.salesOrderItem.deleteMany({
        where: { companyId: identity.companyId, salesOrderId: id },
      });
      await tx.salesOrderItem.createMany({
        data: items.map((item) => ({ ...item, salesOrderId: id })),
      });
      const order = await this.getScoped(tx, identity.companyId, id);
      await this.audit(
        tx,
        identity,
        order,
        'SALES_ORDER_UPDATED',
        requestId,
        {
          customerId: current.customerId,
          warehouseId: current.warehouseId,
          totalAmount: current.totalAmount.toFixed(2),
        },
        {
          customerId: order.customerId,
          warehouseId: order.warehouseId,
          totalAmount: order.totalAmount.toFixed(2),
          changedFields: Object.keys(dto),
        },
      );
      return this.toResponse(order);
    });
  }

  async confirm(identity: AuthenticatedUser, id: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.getScoped(tx, identity.companyId, id);
      if (current.status !== SalesOrderStatus.DRAFT) {
        const code =
          current.status === SalesOrderStatus.CONFIRMED
            ? 'SALES_ORDER_ALREADY_CONFIRMED'
            : 'SALES_ORDER_CANCELLED';
        throw new ConflictException({ code, message: 'Este pedido não pode ser confirmado.' });
      }
      if (!current.items.length) this.emptyOrder();
      await this.ensureHeaderReferences(
        tx,
        identity.companyId,
        current.customerId,
        current.warehouseId,
      );
      await this.ensureProductsActive(
        tx,
        identity.companyId,
        current.items.map((item) => item.productId),
      );
      const changed = await tx.salesOrder.updateMany({
        where: { id, companyId: identity.companyId, status: SalesOrderStatus.DRAFT },
        data: {
          status: SalesOrderStatus.CONFIRMED,
          confirmedByUserId: identity.userId,
          confirmedAt: new Date(),
        },
      });
      if (changed.count !== 1) this.concurrentTransition();
      const order = await this.getScoped(tx, identity.companyId, id);
      await this.audit(
        tx,
        identity,
        order,
        'SALES_ORDER_CONFIRMED',
        requestId,
        { status: SalesOrderStatus.DRAFT },
        { status: SalesOrderStatus.CONFIRMED, totalAmount: order.totalAmount.toFixed(2) },
      );
      return this.toResponse(order);
    });
  }

  async cancel(identity: AuthenticatedUser, id: string, reason: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "SalesOrder"
        WHERE "id" = ${id}::uuid AND "companyId" = ${identity.companyId}::uuid
        FOR UPDATE
      `;
      if (!locked.length) {
        throw new NotFoundException({
          code: 'SALES_ORDER_NOT_FOUND',
          message: 'Pedido de venda não encontrado.',
        });
      }
      const current = await this.getScoped(tx, identity.companyId, id);
      if (current.status === SalesOrderStatus.CANCELLED) {
        throw new ConflictException({
          code: 'SALES_ORDER_CANCELLED',
          message: 'Este pedido já está cancelado.',
        });
      }
      if (current.status === SalesOrderStatus.SHIPPED) {
        throw new ConflictException({
          code: 'SALES_ORDER_ALREADY_SHIPPED',
          message: 'Pedido já baixado não pode ser cancelado.',
        });
      }
      await this.stockReservationsService.releaseForCancellation(tx, identity, current, requestId);
      const changed = await tx.salesOrder.updateMany({
        where: { id, companyId: identity.companyId, status: current.status },
        data: {
          status: SalesOrderStatus.CANCELLED,
          cancelledByUserId: identity.userId,
          cancelledAt: new Date(),
          cancellationReason: reason.trim(),
          reservedByUserId: null,
          reservedAt: null,
        },
      });
      if (changed.count !== 1) this.concurrentTransition();
      const order = await this.getScoped(tx, identity.companyId, id);
      await this.audit(
        tx,
        identity,
        order,
        'SALES_ORDER_CANCELLED',
        requestId,
        { status: current.status },
        { status: SalesOrderStatus.CANCELLED, reason: reason.trim() },
      );
      return this.toResponse(order);
    });
  }

  private async prepareItems(tx: Tx, companyId: string, inputs: SalesOrderItemInputDto[]) {
    if (!inputs.length) this.emptyOrder();
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
        isActive: true,
        unit: { select: { symbol: true } },
      },
    });
    if (products.length !== ids.length) this.productNotFound();
    const byId = new Map(products.map((product) => [product.id, product]));
    return inputs.map((input) => {
      const product = byId.get(input.productId)!;
      if (!product.isActive) this.productInactive(product.name);
      const quantity = new Prisma.Decimal(input.quantity);
      const unitPrice = new Prisma.Decimal(input.unitPrice);
      const discountAmount = new Prisma.Decimal(input.discountAmount ?? '0');
      if (quantity.lte(0)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_QUANTITY',
          message: 'A quantidade deve ser maior que zero.',
        });
      }
      if (unitPrice.lt(0)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_UNIT_PRICE',
          message: 'O preço unitário não pode ser negativo.',
        });
      }
      const grossAmount = quantity.mul(unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      if (discountAmount.lt(0) || discountAmount.gt(grossAmount)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_DISCOUNT',
          message: 'O desconto do item não pode superar seu valor bruto.',
        });
      }
      return {
        companyId,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitSymbol: product.unit.symbol,
        quantity,
        unitPrice,
        discountAmount,
        subtotal: grossAmount.sub(discountAmount),
        reservedQuantity: new Prisma.Decimal(0),
      };
    });
  }

  private calculateTotals(
    dto: Pick<CreateSalesOrderDto, 'discountAmount' | 'freightAmount' | 'otherAmount'>,
    items: Array<{ subtotal: Prisma.Decimal }>,
  ) {
    const subtotal = items.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));
    const discountAmount = new Prisma.Decimal(dto.discountAmount ?? '0');
    const freightAmount = new Prisma.Decimal(dto.freightAmount ?? '0');
    const otherAmount = new Prisma.Decimal(dto.otherAmount ?? '0');
    if (discountAmount.lt(0) || discountAmount.gt(subtotal)) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DISCOUNT',
        message: 'O desconto geral não pode superar o subtotal do pedido.',
      });
    }
    const totalAmount = subtotal.sub(discountAmount).add(freightAmount).add(otherAmount);
    if (totalAmount.lt(0)) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TOTAL',
        message: 'O total do pedido não pode ser negativo.',
      });
    }
    return { subtotal, discountAmount, freightAmount, otherAmount, totalAmount };
  }

  private async getScoped(
    client: Tx | PrismaService,
    companyId: string,
    id: string,
  ): Promise<OrderWithRelations> {
    const order = await client.salesOrder.findFirst({
      where: { id, companyId },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException({
        code: 'SALES_ORDER_NOT_FOUND',
        message: 'Pedido de venda não encontrado.',
      });
    }
    return order;
  }

  private async ensureHeaderReferences(
    tx: Tx,
    companyId: string,
    customerId: string,
    warehouseId: string,
  ) {
    const [customer, warehouse] = await Promise.all([
      tx.customer.findFirst({ where: { id: customerId, companyId } }),
      tx.warehouse.findFirst({ where: { id: warehouseId, companyId } }),
    ]);
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Cliente não encontrado.',
      });
    }
    if (!customer.isActive) {
      throw new UnprocessableEntityException({
        code: 'CUSTOMER_INACTIVE',
        message: 'O cliente está inativo.',
      });
    }
    if (!warehouse) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Depósito não encontrado.',
      });
    }
    if (!warehouse.isActive) {
      throw new UnprocessableEntityException({
        code: 'WAREHOUSE_INACTIVE',
        message: 'O depósito está inativo.',
      });
    }
  }

  private async ensureProductsActive(tx: Tx, companyId: string, ids: string[]) {
    const products = await tx.product.findMany({
      where: { companyId, id: { in: ids } },
      select: { id: true, name: true, isActive: true },
    });
    if (products.length !== ids.length) this.productNotFound();
    const inactive = products.find((product) => !product.isActive);
    if (inactive) this.productInactive(inactive.name);
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
        entity: 'SalesOrder',
        entityId: order.id,
        action,
        before: before ? (before as Prisma.InputJsonObject) : Prisma.JsonNull,
        after: {
          orderId: order.id,
          number: order.number,
          customerId: order.customerId,
          totalAmount: order.totalAmount.toFixed(2),
          ...after,
        } as Prisma.InputJsonObject,
        requestId,
      },
    });
  }

  private emptyOrder(): never {
    throw new UnprocessableEntityException({
      code: 'SALES_ORDER_EMPTY',
      message: 'O pedido deve possuir ao menos um item.',
    });
  }

  private productNotFound(): never {
    throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Produto não encontrado.' });
  }

  private productInactive(name: string): never {
    throw new UnprocessableEntityException({
      code: 'PRODUCT_INACTIVE',
      message: `O produto ${name} está inativo.`,
    });
  }

  private notEditable(status: SalesOrderStatus): never {
    throw new ConflictException({
      code:
        status === SalesOrderStatus.CANCELLED
          ? 'SALES_ORDER_CANCELLED'
          : 'SALES_ORDER_NOT_EDITABLE',
      message: 'Somente pedidos em rascunho podem ser editados.',
    });
  }

  private concurrentTransition(): never {
    throw new ConflictException({
      code: 'SALES_ORDER_CONCURRENT_CHANGE',
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

  private today() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private textOrNull(value?: string | null) {
    return value?.trim() || null;
  }

  private toResponse(order: OrderWithRelations): SalesOrderResponseDto {
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        document: order.customer.document,
        creditLimit: order.customer.creditLimit.toFixed(2),
      },
      warehouse: order.warehouse,
      orderDate: order.orderDate.toISOString().slice(0, 10),
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
        unitPrice: item.unitPrice.toFixed(2),
        grossAmount: item.quantity
          .mul(item.unitPrice)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          .toFixed(2),
        discountAmount: item.discountAmount.toFixed(2),
        subtotal: item.subtotal.toFixed(2),
        reservedQuantity: item.reservedQuantity.toFixed(4),
        reservations: item.reservations.map((reservation) => ({
          id: reservation.id,
          status: reservation.status,
          quantity: reservation.quantity.toFixed(4),
          location: reservation.location,
        })),
      })),
      createdBy: order.createdBy,
      confirmedBy: order.confirmedBy,
      reservedBy: order.reservedBy,
      shippedBy: order.shippedBy,
      cancelledBy: order.cancelledBy,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      reservedAt: order.reservedAt?.toISOString() ?? null,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      shipmentNotes: order.shipmentNotes,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      cancellationReason: order.cancellationReason,
    };
  }
}
