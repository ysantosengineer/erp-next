import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InventoryCountStatus, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddInventoryCountItemDto,
  CreateInventoryCountDto,
  InventoryCountDetailQueryDto,
  ListInventoryCountsQueryDto,
  SubmitInventoryCountQuantityDto,
} from './dto/inventory-counts.dto';

const activeStatuses = [
  InventoryCountStatus.DRAFT,
  InventoryCountStatus.IN_PROGRESS,
  InventoryCountStatus.RECOUNT_REQUIRED,
  InventoryCountStatus.READY_FOR_APPROVAL,
];

const countInclude = {
  warehouse: { select: { id: true, name: true, code: true, isActive: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  cancelledBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.InventoryCountInclude;

const itemInclude = {
  product: { select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } } },
  location: { select: { id: true, code: true } },
  countedBy: { select: { id: true, name: true } },
  recountedBy: { select: { id: true, name: true } },
} satisfies Prisma.InventoryCountItemInclude;

type CountWithRelations = Prisma.InventoryCountGetPayload<{ include: typeof countInclude }>;
type ItemWithRelations = Prisma.InventoryCountItemGetPayload<{ include: typeof itemInclude }>;
type InventorySummary = {
  totalItems: number;
  countedItems: number;
  divergentItems: number;
  recountPendingItems: number;
  positiveDifferences: number;
  negativeDifferences: number;
};

@Injectable()
export class InventoryCountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async findAll(identity: AuthenticatedUser, query: ListInventoryCountsQueryDto) {
    const where: Prisma.InventoryCountWhereInput = {
      companyId: identity.companyId,
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { warehouse: { name: { contains: query.search, mode: 'insensitive' } } },
              { warehouse: { code: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryCount.findMany({
        where,
        include: countInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.inventoryCount.count({ where }),
    ]);
    const summaries = await this.getSummaries(
      rows.map((row) => row.id),
      identity.companyId,
    );
    return {
      data: rows.map((row) => this.toCount(row, summaries.get(row.id) ?? this.emptySummary())),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(
    identity: AuthenticatedUser,
    id: string,
    query: InventoryCountDetailQueryDto = new InventoryCountDetailQueryDto(),
  ) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: { id, companyId: identity.companyId },
      include: countInclude,
    });
    if (!count) this.notFound();
    const itemWhere: Prisma.InventoryCountItemWhereInput = {
      companyId: identity.companyId,
      inventoryCountId: id,
      ...(query.itemSearch
        ? {
            OR: [
              { product: { name: { contains: query.itemSearch, mode: 'insensitive' } } },
              { product: { sku: { contains: query.itemSearch, mode: 'insensitive' } } },
              { location: { code: { contains: query.itemSearch, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [summary, items, totalItems, movements] = await Promise.all([
      this.getSummary(id, identity.companyId),
      this.prisma.inventoryCountItem.findMany({
        where: itemWhere,
        include: itemInclude,
        skip: (query.itemsPage - 1) * query.itemsLimit,
        take: query.itemsLimit,
        orderBy: [{ location: { code: 'asc' } }, { product: { name: 'asc' } }],
      }),
      this.prisma.inventoryCountItem.count({ where: itemWhere }),
      this.prisma.stockMovement.findMany({
        where: { companyId: identity.companyId, referenceType: 'INVENTORY', referenceId: id },
        select: { id: true, type: true, quantity: true, productId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      ...this.toCount(count, summary),
      items: {
        data: items.map((item) => this.toItem(item)),
        meta: {
          page: query.itemsPage,
          limit: query.itemsLimit,
          total: totalItems,
          totalPages: Math.ceil(totalItems / query.itemsLimit),
        },
      },
      movements: movements.map((movement) => ({
        ...movement,
        quantity: movement.quantity.toFixed(4),
        createdAt: movement.createdAt.toISOString(),
      })),
    };
  }

  async create(identity: AuthenticatedUser, dto: CreateInventoryCountDto, requestId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId: identity.companyId },
      select: { id: true, isActive: true },
    });
    if (!warehouse) this.warehouseNotFound();
    if (!warehouse.isActive)
      throw new UnprocessableEntityException({
        code: 'WAREHOUSE_INACTIVE',
        message: 'Não é possível inventariar um depósito inativo.',
      });
    const active = await this.prisma.inventoryCount.findFirst({
      where: {
        companyId: identity.companyId,
        warehouseId: dto.warehouseId,
        status: { in: activeStatuses },
      },
      select: { id: true },
    });
    if (active) this.warehouseUnderInventory();
    try {
      const count = await this.prisma.$transaction(async (tx) => {
        const created = await tx.inventoryCount.create({
          data: {
            companyId: identity.companyId,
            warehouseId: dto.warehouseId,
            description: dto.description?.trim() || null,
            createdByUserId: identity.userId,
          },
          include: countInclude,
        });
        await this.audit(tx, identity, created.id, 'INVENTORY_COUNT_CREATED', requestId, {
          warehouseId: dto.warehouseId,
          status: created.status,
        });
        return created;
      });
      return this.toCount(count, this.emptySummary());
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        this.warehouseUnderInventory();
      throw error;
    }
  }

  async options(identity: AuthenticatedUser, warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId: identity.companyId },
      select: { id: true },
    });
    if (!warehouse) this.warehouseNotFound();
    const [products, locations] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { companyId: identity.companyId, isActive: true },
        select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.stockLocation.findMany({
        where: {
          companyId: identity.companyId,
          warehouseId,
          isActive: true,
          warehouse: { isActive: true },
        },
        select: { id: true, code: true },
        orderBy: { code: 'asc' },
      }),
    ]);
    return { products, locations };
  }

  async start(identity: AuthenticatedUser, id: string, requestId: string) {
    await this.prisma.$transaction(
      async (tx) => {
        const count = await this.lockCount(tx, identity, id);
        if (count.status !== InventoryCountStatus.DRAFT)
          throw new ConflictException({
            code: 'INVENTORY_INVALID_STATUS',
            message: 'Somente inventários em rascunho podem ser iniciados.',
          });
        const warehouse = await tx.warehouse.findFirst({
          where: { id: count.warehouseId, companyId: identity.companyId },
          select: { isActive: true },
        });
        if (!warehouse) this.warehouseNotFound();
        if (!warehouse.isActive)
          throw new UnprocessableEntityException({
            code: 'WAREHOUSE_INACTIVE',
            message: 'Não é possível iniciar inventário em depósito inativo.',
          });
        const balances = await tx.inventoryBalance.findMany({
          where: { companyId: identity.companyId, location: { warehouseId: count.warehouseId } },
          select: { productId: true, locationId: true, quantity: true },
        });
        if (balances.length) {
          await tx.inventoryCountItem.createMany({
            data: balances.map((balance) => ({
              companyId: identity.companyId,
              inventoryCountId: id,
              productId: balance.productId,
              locationId: balance.locationId,
              systemQuantity: balance.quantity,
            })),
          });
        }
        const startedAt = new Date();
        await tx.inventoryCount.update({
          where: { id },
          data: { status: InventoryCountStatus.IN_PROGRESS, startedAt },
        });
        await this.audit(tx, identity, id, 'INVENTORY_COUNT_STARTED', requestId, {
          warehouseId: count.warehouseId,
          itemCount: balances.length,
          startedAt: startedAt.toISOString(),
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.findOne(identity, id);
  }

  async addItem(
    identity: AuthenticatedUser,
    id: string,
    dto: AddInventoryCountItemDto,
    requestId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const count = await this.lockCount(tx, identity, id);
      if (count.status !== InventoryCountStatus.IN_PROGRESS)
        throw new ConflictException({
          code: 'INVENTORY_NOT_IN_PROGRESS',
          message: 'Itens só podem ser adicionados durante a primeira contagem.',
        });
      const [product, location, balance] = await Promise.all([
        tx.product.findFirst({
          where: { id: dto.productId, companyId: identity.companyId },
          select: { isActive: true },
        }),
        tx.stockLocation.findFirst({
          where: {
            id: dto.locationId,
            companyId: identity.companyId,
            warehouseId: count.warehouseId,
          },
          select: { isActive: true, warehouse: { select: { isActive: true } } },
        }),
        tx.inventoryBalance.findUnique({
          where: {
            companyId_productId_locationId: {
              companyId: identity.companyId,
              productId: dto.productId,
              locationId: dto.locationId,
            },
          },
          select: { id: true },
        }),
      ]);
      if (!product || !location)
        throw new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Produto ou endereço não encontrado.',
        });
      if (!product.isActive || !location.isActive || !location.warehouse.isActive)
        throw new UnprocessableEntityException({
          code: 'RESOURCE_INACTIVE',
          message: 'Produto, depósito e endereço precisam estar ativos.',
        });
      if (balance)
        throw new ConflictException({
          code: 'INVENTORY_BALANCE_ITEM_EXISTS',
          message: 'O item já possui saldo registrado e deveria constar no snapshot.',
        });
      try {
        await tx.inventoryCountItem.create({
          data: {
            companyId: identity.companyId,
            inventoryCountId: id,
            productId: dto.productId,
            locationId: dto.locationId,
            systemQuantity: new Prisma.Decimal(0),
          },
        });
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
          throw new ConflictException({
            code: 'INVENTORY_ITEM_EXISTS',
            message: 'Produto e endereço já fazem parte do inventário.',
          });
        throw error;
      }
      await this.audit(tx, identity, id, 'INVENTORY_ITEM_ADDED', requestId, {
        productId: dto.productId,
        locationId: dto.locationId,
      });
    });
    return this.findOne(identity, id);
  }

  async countItem(
    identity: AuthenticatedUser,
    id: string,
    itemId: string,
    dto: SubmitInventoryCountQuantityDto,
    requestId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const count = await this.getCount(tx, identity, id);
      if (count.status !== InventoryCountStatus.IN_PROGRESS)
        throw new ConflictException({
          code: 'INVENTORY_NOT_IN_PROGRESS',
          message: 'A primeira contagem não pode ser alterada neste estado.',
        });
      const item = await tx.inventoryCountItem.findFirst({
        where: { id: itemId, inventoryCountId: id, companyId: identity.companyId },
        select: { id: true },
      });
      if (!item) this.itemNotFound();
      const quantity = new Prisma.Decimal(dto.quantity);
      await tx.inventoryCountItem.update({
        where: { id: itemId },
        data: {
          firstCountQuantity: quantity,
          countedByUserId: identity.userId,
          countedAt: new Date(),
        },
      });
      await this.audit(tx, identity, id, 'INVENTORY_ITEM_COUNTED', requestId, {
        itemId,
        quantity: quantity.toFixed(4),
      });
    });
    return this.findOne(identity, id);
  }

  async requestRecount(identity: AuthenticatedUser, id: string, requestId: string) {
    await this.prisma.$transaction(
      async (tx) => {
        const count = await this.lockCount(tx, identity, id);
        if (
          count.status !== InventoryCountStatus.IN_PROGRESS &&
          count.status !== InventoryCountStatus.READY_FOR_APPROVAL
        )
          throw new ConflictException({
            code: 'INVENTORY_INVALID_STATUS',
            message: 'O inventário não está disponível para solicitação de recontagem.',
          });
        const items = await tx.inventoryCountItem.findMany({
          where: { companyId: identity.companyId, inventoryCountId: id },
          select: { id: true, systemQuantity: true, firstCountQuantity: true },
        });
        if (!items.length || items.some((item) => item.firstCountQuantity === null))
          throw new UnprocessableEntityException({
            code: 'COUNT_REQUIRED',
            message: 'Todos os itens precisam da primeira contagem.',
          });
        const divergentIds = items
          .filter((item) => !item.firstCountQuantity!.equals(item.systemQuantity))
          .map((item) => item.id);
        if (count.status === InventoryCountStatus.READY_FOR_APPROVAL && divergentIds.length) {
          await tx.inventoryCountItem.updateMany({
            where: { id: { in: divergentIds }, companyId: identity.companyId },
            data: { recountQuantity: null, recountedByUserId: null, recountedAt: null },
          });
        }
        const nextStatus = divergentIds.length
          ? InventoryCountStatus.RECOUNT_REQUIRED
          : InventoryCountStatus.READY_FOR_APPROVAL;
        const completedAt = divergentIds.length ? null : new Date();
        await tx.inventoryCount.update({
          where: { id },
          data: { status: nextStatus, completedAt },
        });
        await this.audit(tx, identity, id, 'INVENTORY_RECOUNT_REQUESTED', requestId, {
          divergentItems: divergentIds.length,
          status: nextStatus,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.findOne(identity, id);
  }

  async recountItem(
    identity: AuthenticatedUser,
    id: string,
    itemId: string,
    dto: SubmitInventoryCountQuantityDto,
    requestId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const count = await this.getCount(tx, identity, id);
      if (count.status !== InventoryCountStatus.RECOUNT_REQUIRED)
        throw new ConflictException({
          code: 'RECOUNT_NOT_REQUIRED',
          message: 'O inventário não está aguardando recontagem.',
        });
      const item = await tx.inventoryCountItem.findFirst({
        where: { id: itemId, inventoryCountId: id, companyId: identity.companyId },
        select: { systemQuantity: true, firstCountQuantity: true },
      });
      if (!item) this.itemNotFound();
      if (!item.firstCountQuantity || item.firstCountQuantity.equals(item.systemQuantity))
        throw new UnprocessableEntityException({
          code: 'RECOUNT_NOT_REQUIRED',
          message: 'Somente itens divergentes podem ser recontados.',
        });
      const quantity = new Prisma.Decimal(dto.quantity);
      await tx.inventoryCountItem.update({
        where: { id: itemId },
        data: {
          recountQuantity: quantity,
          recountedByUserId: identity.userId,
          recountedAt: new Date(),
        },
      });
      const divergentItems = await tx.inventoryCountItem.findMany({
        where: { companyId: identity.companyId, inventoryCountId: id },
        select: { systemQuantity: true, firstCountQuantity: true, recountQuantity: true },
      });
      const pending = divergentItems.some(
        (candidate) =>
          candidate.firstCountQuantity !== null &&
          !candidate.firstCountQuantity.equals(candidate.systemQuantity) &&
          candidate.recountQuantity === null,
      );
      if (!pending) {
        await tx.inventoryCount.update({
          where: { id },
          data: { status: InventoryCountStatus.READY_FOR_APPROVAL, completedAt: new Date() },
        });
      }
      await this.audit(tx, identity, id, 'INVENTORY_ITEM_RECOUNTED', requestId, {
        itemId,
        quantity: quantity.toFixed(4),
      });
    });
    return this.findOne(identity, id);
  }

  async approve(identity: AuthenticatedUser, id: string, requestId: string) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            const count = await this.lockCount(tx, identity, id);
            if (count.status === InventoryCountStatus.APPROVED)
              throw new ConflictException({
                code: 'INVENTORY_ALREADY_APPROVED',
                message: 'O inventário já foi aprovado.',
              });
            if (count.status === InventoryCountStatus.CANCELLED)
              throw new ConflictException({
                code: 'INVENTORY_CANCELLED',
                message: 'Inventário cancelado não pode ser aprovado.',
              });
            if (count.status !== InventoryCountStatus.READY_FOR_APPROVAL)
              throw new UnprocessableEntityException({
                code: 'INVENTORY_NOT_READY',
                message: 'Conclua todas as contagens e recontagens antes da aprovação.',
              });
            const items = await tx.inventoryCountItem.findMany({
              where: { companyId: identity.companyId, inventoryCountId: id },
              select: {
                id: true,
                productId: true,
                locationId: true,
                systemQuantity: true,
                firstCountQuantity: true,
                recountQuantity: true,
              },
              orderBy: { id: 'asc' },
            });
            if (!items.length)
              throw new UnprocessableEntityException({
                code: 'INVENTORY_NOT_READY',
                message: 'O inventário não possui itens para aprovação.',
              });
            const movementIds: string[] = [];
            for (const item of items) {
              if (item.firstCountQuantity === null)
                throw new UnprocessableEntityException({
                  code: 'COUNT_REQUIRED',
                  message: 'Existem itens sem primeira contagem.',
                });
              const firstDifference = item.firstCountQuantity.minus(item.systemQuantity);
              const finalQuantity = firstDifference.equals(0)
                ? item.firstCountQuantity
                : item.recountQuantity;
              if (finalQuantity === null)
                throw new UnprocessableEntityException({
                  code: 'RECOUNT_REQUIRED',
                  message: 'Existem itens divergentes sem recontagem.',
                });
              const difference = finalQuantity.minus(item.systemQuantity);
              if (difference.equals(0)) continue;
              movementIds.push(
                await this.inventoryService.applyInventoryAdjustment(
                  tx,
                  identity,
                  {
                    inventoryCountId: id,
                    productId: item.productId,
                    locationId: item.locationId,
                    quantity: difference.abs().toFixed(4),
                    direction: difference.greaterThan(0) ? 'IN' : 'OUT',
                    reason: `Ajuste do inventário físico ${id}`,
                  },
                  requestId,
                ),
              );
            }
            const approvedAt = new Date();
            await tx.inventoryCount.update({
              where: { id },
              data: {
                status: InventoryCountStatus.APPROVED,
                approvedAt,
                completedAt: count.completedAt ?? approvedAt,
                approvedByUserId: identity.userId,
              },
            });
            await this.audit(tx, identity, id, 'INVENTORY_COUNT_APPROVED', requestId, {
              movementIds,
              adjustedItems: movementIds.length,
              approvedAt: approvedAt.toISOString(),
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return this.findOne(identity, id);
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        )
          continue;
        throw error;
      }
    }
    throw new ConflictException({
      code: 'INVENTORY_CONCURRENT_APPROVAL',
      message: 'Conflito concorrente ao aprovar inventário. Tente novamente.',
    });
  }

  async cancel(identity: AuthenticatedUser, id: string, requestId: string) {
    await this.prisma.$transaction(
      async (tx) => {
        const count = await this.lockCount(tx, identity, id);
        if (count.status === InventoryCountStatus.APPROVED)
          throw new ConflictException({
            code: 'INVENTORY_ALREADY_APPROVED',
            message: 'Inventário aprovado é imutável e não pode ser cancelado.',
          });
        if (count.status === InventoryCountStatus.CANCELLED)
          throw new ConflictException({
            code: 'INVENTORY_CANCELLED',
            message: 'O inventário já foi cancelado.',
          });
        const cancelledAt = new Date();
        await tx.inventoryCount.update({
          where: { id },
          data: {
            status: InventoryCountStatus.CANCELLED,
            cancelledAt,
            cancelledByUserId: identity.userId,
          },
        });
        await this.audit(tx, identity, id, 'INVENTORY_COUNT_CANCELLED', requestId, {
          previousStatus: count.status,
          cancelledAt: cancelledAt.toISOString(),
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.findOne(identity, id);
  }

  private async getSummary(id: string, companyId: string): Promise<InventorySummary> {
    return (await this.getSummaries([id], companyId)).get(id) ?? this.emptySummary();
  }

  private async getSummaries(ids: string[], companyId: string) {
    if (!ids.length) return new Map<string, InventorySummary>();
    const rows = await this.prisma.$queryRaw<
      Array<InventorySummary & { inventoryCountId: string }>
    >(
      Prisma.sql`
      SELECT
        "inventoryCountId",
        COUNT(*)::int AS "totalItems",
        COUNT("firstCountQuantity")::int AS "countedItems",
        COUNT(*) FILTER (
          WHERE "firstCountQuantity" IS NOT NULL
            AND "firstCountQuantity" <> "systemQuantity"
        )::int AS "divergentItems",
        COUNT(*) FILTER (
          WHERE "firstCountQuantity" IS NOT NULL
            AND "firstCountQuantity" <> "systemQuantity"
            AND "recountQuantity" IS NULL
        )::int AS "recountPendingItems",
        COUNT(*) FILTER (
          WHERE COALESCE("recountQuantity", "firstCountQuantity") - "systemQuantity" > 0
        )::int AS "positiveDifferences",
        COUNT(*) FILTER (
          WHERE COALESCE("recountQuantity", "firstCountQuantity") - "systemQuantity" < 0
        )::int AS "negativeDifferences"
      FROM "InventoryCountItem"
      WHERE "companyId" = ${companyId}::uuid
        AND "inventoryCountId" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
      GROUP BY "inventoryCountId"
    `,
    );
    return new Map(rows.map((row) => [row.inventoryCountId, row]));
  }

  private async getCount(tx: Prisma.TransactionClient, identity: AuthenticatedUser, id: string) {
    const count = await tx.inventoryCount.findFirst({
      where: { id, companyId: identity.companyId },
    });
    if (!count) this.notFound();
    return count;
  }

  private async lockCount(tx: Prisma.TransactionClient, identity: AuthenticatedUser, id: string) {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "InventoryCount"
      WHERE "id" = ${id}::uuid AND "companyId" = ${identity.companyId}::uuid
      FOR UPDATE
    `);
    return this.getCount(tx, identity, id);
  }

  private audit(
    tx: Prisma.TransactionClient,
    identity: AuthenticatedUser,
    entityId: string,
    action: string,
    requestId: string,
    after: Prisma.InputJsonValue,
  ) {
    return tx.auditLog.create({
      data: {
        actorId: identity.userId,
        companyId: identity.companyId,
        entity: 'InventoryCount',
        entityId,
        action,
        after,
        requestId,
      },
    });
  }

  private toCount(count: CountWithRelations, summary: InventorySummary) {
    return {
      id: count.id,
      status: count.status,
      description: count.description,
      warehouse: count.warehouse,
      createdBy: count.createdBy,
      approvedBy: count.approvedBy,
      cancelledBy: count.cancelledBy,
      summary,
      startedAt: count.startedAt?.toISOString() ?? null,
      completedAt: count.completedAt?.toISOString() ?? null,
      approvedAt: count.approvedAt?.toISOString() ?? null,
      cancelledAt: count.cancelledAt?.toISOString() ?? null,
      createdAt: count.createdAt.toISOString(),
      updatedAt: count.updatedAt.toISOString(),
    };
  }

  private toItem(item: ItemWithRelations) {
    const firstDifference = item.firstCountQuantity?.minus(item.systemQuantity) ?? null;
    const finalQuantity =
      item.firstCountQuantity === null
        ? null
        : firstDifference!.equals(0)
          ? item.firstCountQuantity
          : item.recountQuantity;
    const difference = finalQuantity?.minus(item.systemQuantity) ?? null;
    return {
      id: item.id,
      product: item.product,
      location: item.location,
      systemQuantity: item.systemQuantity.toFixed(4),
      firstCountQuantity: item.firstCountQuantity?.toFixed(4) ?? null,
      recountQuantity: item.recountQuantity?.toFixed(4) ?? null,
      finalCountQuantity: finalQuantity?.toFixed(4) ?? null,
      differenceQuantity: difference?.toFixed(4) ?? null,
      countedBy: item.countedBy,
      recountedBy: item.recountedBy,
      countedAt: item.countedAt?.toISOString() ?? null,
      recountedAt: item.recountedAt?.toISOString() ?? null,
      status:
        item.firstCountQuantity === null
          ? 'COUNT_PENDING'
          : !firstDifference!.equals(0) && item.recountQuantity === null
            ? 'RECOUNT_PENDING'
            : difference!.equals(0)
              ? 'MATCHED'
              : difference!.greaterThan(0)
                ? 'POSITIVE_DIFFERENCE'
                : 'NEGATIVE_DIFFERENCE',
    };
  }

  private emptySummary(): InventorySummary {
    return {
      totalItems: 0,
      countedItems: 0,
      divergentItems: 0,
      recountPendingItems: 0,
      positiveDifferences: 0,
      negativeDifferences: 0,
    };
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'INVENTORY_COUNT_NOT_FOUND',
      message: 'Inventário não encontrado.',
    });
  }

  private itemNotFound(): never {
    throw new NotFoundException({
      code: 'INVENTORY_ITEM_NOT_FOUND',
      message: 'Item de inventário não encontrado.',
    });
  }

  private warehouseNotFound(): never {
    throw new NotFoundException({
      code: 'WAREHOUSE_NOT_FOUND',
      message: 'Depósito não encontrado.',
    });
  }

  private warehouseUnderInventory(): never {
    throw new ConflictException({
      code: 'WAREHOUSE_UNDER_INVENTORY',
      message: 'Já existe um inventário não finalizado para este depósito.',
    });
  }
}
