import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus, SalesOrderStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PERMISSIONS } from '../authorization/permissions.constants';
import { FinanceService } from '../finance/finance.service';
import type { ListFinancialEntriesQueryDto } from '../finance/dto/finance.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsInventoryQueryDto,
  AnalyticsInventorySortField,
  AnalyticsPeriodQueryDto,
  AnalyticsPurchasesQueryDto,
  AnalyticsSalesQueryDto,
} from './dto/analytics.dto';

const VALID_SALES = [
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.RESERVED,
  SalesOrderStatus.SHIPPED,
];
const APPROVED_PURCHASES = [
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
  PurchaseOrderStatus.RECEIVED,
];
const PENDING_RECEIPT = [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED];

type Period = {
  startDate: string;
  endDate: string;
  start: Date;
  endExclusive: Date;
  previousStart: Date;
  previousEndExclusive: Date;
  previousStartDate: string;
  previousEndDate: string;
  groupBy: 'day' | 'month';
};

type NumericAggregate = { count: bigint; amount: Prisma.Decimal | null };
type UnitQuantity = { unitSymbol: string; quantity: Prisma.Decimal };
type SeriesRow = { bucket: Date; count: bigint; amount: Prisma.Decimal };
type StatusRow = { status: SalesOrderStatus; count: bigint };
type RankingRow = {
  id: string;
  name: string;
  sku: string;
  unitSymbol: string;
  quantity: Prisma.Decimal;
  amount: Prisma.Decimal;
};
type InventorySummaryRow = {
  productsCount: bigint;
  productsWithStock: bigint;
  productsWithoutStock: bigint;
  lowStockProducts: bigint;
  activeReservations: bigint;
  reservedOrders: bigint;
};
type InventoryReportRow = {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol: string;
  minimumStock: Prisma.Decimal;
  warehouseId: string | null;
  warehouseName: string | null;
  locationId: string | null;
  locationCode: string | null;
  physical: Prisma.Decimal;
  reserved: Prisma.Decimal;
  available: Prisma.Decimal;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
  ) {}

  async dashboard(identity: AuthenticatedUser, query: AnalyticsPeriodQueryDto) {
    const period = this.period(query);
    const can = (permission: string) => identity.permissions.includes(permission);
    const [sales, purchases, inventory, finance] = await Promise.all([
      can(PERMISSIONS.SALES_ORDERS_READ)
        ? this.salesSummary(identity.companyId, period, query.warehouseId)
        : null,
      can(PERMISSIONS.PURCHASE_ORDERS_READ)
        ? this.purchasesSummary(identity.companyId, period, query.warehouseId)
        : null,
      can(PERMISSIONS.INVENTORY_READ)
        ? this.inventorySummary(
            identity.companyId,
            can(PERMISSIONS.INVENTORY_MOVEMENTS_READ),
            query.warehouseId,
          )
        : null,
      can(PERMISSIONS.FINANCE_READ)
        ? this.finance.summary(identity, { startDate: period.startDate, endDate: period.endDate })
        : null,
    ]);
    const alerts = [
      ...(inventory
        ? [
            {
              code: 'NO_STOCK',
              label: 'Produtos sem estoque',
              count: inventory.productsWithoutStock,
              href: '/reports/inventory?stock=no-stock',
            },
            {
              code: 'LOW_STOCK',
              label: 'Produtos com estoque baixo',
              count: inventory.lowStockProducts,
              href: '/reports/inventory?stock=low',
            },
          ]
        : []),
      ...(purchases
        ? [
            {
              code: 'PENDING_RECEIPTS',
              label: 'Compras aguardando recebimento',
              count: purchases.pendingReceiptsCount,
              href: '/reports/purchases?pendingReceipt=true',
            },
          ]
        : []),
      ...(finance
        ? [
            {
              code: 'OVERDUE_RECEIVABLES',
              label: 'Contas a receber vencidas',
              amount: finance.overdueReceivables,
              href: '/finance/receivables?overdue=true',
            },
            {
              code: 'OVERDUE_PAYABLES',
              label: 'Contas a pagar vencidas',
              amount: finance.overduePayables,
              href: '/finance/payables?overdue=true',
            },
          ]
        : []),
    ];
    const financeSection = finance
      ? {
          ...finance,
          realizedNet: new Prisma.Decimal(finance.receivedInPeriod)
            .sub(finance.paidInPeriod)
            .toFixed(2),
        }
      : null;
    return {
      period: this.periodResponse(period),
      generatedAt: new Date().toISOString(),
      sections: { sales, purchases, inventory, finance: financeSection },
      alerts,
    };
  }

  async salesReport(identity: AuthenticatedUser, query: AnalyticsSalesQueryDto) {
    const period = this.period(query);
    const where: Prisma.SalesOrderWhereInput = {
      companyId: identity.companyId,
      status: { in: VALID_SALES },
      orderDate: { gte: period.start, lt: period.endExclusive },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const orderBy = {
      [query.sortBy]: query.sortOrder,
    } as Prisma.SalesOrderOrderByWithRelationInput;
    const [data, total, summary] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        select: {
          id: true,
          number: true,
          orderDate: true,
          status: true,
          totalAmount: true,
          customer: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
        orderBy: [orderBy, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.salesOrder.count({ where }),
      this.salesSummary(identity.companyId, period, query.warehouseId),
    ]);
    return {
      period: this.periodResponse(period),
      summary,
      data: data.map((item) => ({
        ...item,
        orderDate: this.isoDate(item.orderDate),
        totalAmount: item.totalAmount.toFixed(2),
      })),
      meta: this.meta(query.page, query.limit, total),
    };
  }

  async purchasesReport(identity: AuthenticatedUser, query: AnalyticsPurchasesQueryDto) {
    const period = this.period(query);
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId: identity.companyId,
      createdAt: { gte: period.start, lt: period.endExclusive },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const orderBy = {
      [query.sortBy]: query.sortOrder,
    } as Prisma.PurchaseOrderOrderByWithRelationInput;
    const [data, total, summary] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        select: {
          id: true,
          number: true,
          createdAt: true,
          expectedDeliveryDate: true,
          status: true,
          totalAmount: true,
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          items: { select: { quantity: true, receivedQuantity: true, unitCost: true } },
        },
        orderBy: [orderBy, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
      this.purchasesSummary(identity.companyId, period, query.warehouseId),
    ]);
    return {
      period: this.periodResponse(period),
      summary,
      data: data.map(({ items, ...item }) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        expectedDeliveryDate: item.expectedDeliveryDate
          ? this.isoDate(item.expectedDeliveryDate)
          : null,
        totalAmount: item.totalAmount.toFixed(2),
        receivedAmount: items
          .reduce(
            (sum, line) => sum.add(line.receivedQuantity.mul(line.unitCost)),
            new Prisma.Decimal(0),
          )
          .toFixed(2),
        pendingItemsCount: items.filter((line) => line.receivedQuantity.lt(line.quantity)).length,
      })),
      meta: this.meta(query.page, query.limit, total),
    };
  }

  async inventoryReport(identity: AuthenticatedUser, query: AnalyticsInventoryQueryDto) {
    this.period(query);
    const search = query.search ? `%${query.search}%` : null;
    const warehouse = query.warehouseId ?? null;
    const orderColumns: Record<AnalyticsInventorySortField, Prisma.Sql> = {
      [AnalyticsInventorySortField.PRODUCT_NAME]: Prisma.sql`"productName"`,
      [AnalyticsInventorySortField.SKU]: Prisma.sql`sku`,
      [AnalyticsInventorySortField.AVAILABLE]: Prisma.sql`available`,
    };
    const direction = query.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const offset = (query.page - 1) * query.limit;
    const rows = await this.prisma.$queryRaw<InventoryReportRow[]>(Prisma.sql`
      WITH reservations AS (
        SELECT "productId", "locationId", SUM(quantity) reserved
        FROM "StockReservation"
        WHERE "companyId" = ${identity.companyId}::uuid AND status = 'ACTIVE'::"StockReservationStatus"
        GROUP BY "productId", "locationId"
      )
      SELECT p.id "productId", p.name "productName", p.sku, u.symbol "unitSymbol", p."minimumStock",
             w.id "warehouseId", w.name "warehouseName", l.id "locationId", l.code "locationCode",
             COALESCE(b.quantity, 0) physical, COALESCE(r.reserved, 0) reserved,
             COALESCE(b.quantity, 0) - COALESCE(r.reserved, 0) available
      FROM "Product" p
      JOIN "UnitOfMeasure" u ON u.id = p."unitId"
      LEFT JOIN "InventoryBalance" b ON b."companyId" = p."companyId" AND b."productId" = p.id
      LEFT JOIN "StockLocation" l ON l.id = b."locationId" AND l."companyId" = p."companyId"
      LEFT JOIN "Warehouse" w ON w.id = l."warehouseId" AND w."companyId" = p."companyId"
      LEFT JOIN reservations r ON r."productId" = p.id AND r."locationId" = b."locationId"
      WHERE p."companyId" = ${identity.companyId}::uuid AND p."isActive" = true
        AND (${warehouse}::uuid IS NULL OR w.id = ${warehouse}::uuid)
        AND (${search}::text IS NULL OR p.name ILIKE ${search} OR p.sku ILIKE ${search})
      ORDER BY ${orderColumns[query.sortBy]} ${direction}, p.id ASC
      OFFSET ${offset} LIMIT ${query.limit}
    `);
    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) count FROM "Product" p
      LEFT JOIN "InventoryBalance" b ON b."companyId" = p."companyId" AND b."productId" = p.id
      LEFT JOIN "StockLocation" l ON l.id = b."locationId"
      LEFT JOIN "Warehouse" w ON w.id = l."warehouseId"
      WHERE p."companyId" = ${identity.companyId}::uuid AND p."isActive" = true
        AND (${warehouse}::uuid IS NULL OR w.id = ${warehouse}::uuid)
        AND (${search}::text IS NULL OR p.name ILIKE ${search} OR p.sku ILIKE ${search})
    `);
    return {
      data: rows.map((row) => ({
        ...row,
        minimumStock: row.minimumStock.toFixed(3),
        physical: row.physical.toFixed(4),
        reserved: row.reserved.toFixed(4),
        available: row.available.toFixed(4),
      })),
      meta: this.meta(query.page, query.limit, Number(countRows[0]?.count ?? 0)),
    };
  }

  financeReport(identity: AuthenticatedUser, query: ListFinancialEntriesQueryDto) {
    return this.finance.findAll(identity, query);
  }

  private async salesSummary(companyId: string, period: Period, warehouseId?: string) {
    const warehouse = warehouseId ?? null;
    const [currentRows, previousRows, units, statusGroups, series, topProducts] =
      await this.prisma.$transaction([
        this.salesAggregate(companyId, period.start, period.endExclusive, warehouse),
        this.salesAggregate(
          companyId,
          period.previousStart,
          period.previousEndExclusive,
          warehouse,
        ),
        this.prisma.$queryRaw<UnitQuantity[]>(Prisma.sql`
        SELECT i."unitSymbol", SUM(i.quantity) quantity FROM "SalesOrderItem" i
        JOIN "SalesOrder" o ON o.id = i."salesOrderId" AND o."companyId" = i."companyId"
        WHERE o."companyId" = ${companyId}::uuid AND o.status IN ('CONFIRMED','RESERVED','SHIPPED')
          AND o."orderDate" >= ${period.start} AND o."orderDate" < ${period.endExclusive}
          AND (${warehouse}::uuid IS NULL OR o."warehouseId" = ${warehouse}::uuid)
        GROUP BY i."unitSymbol" ORDER BY i."unitSymbol"
      `),
        this.prisma.$queryRaw<StatusRow[]>(Prisma.sql`
        SELECT status, COUNT(*) count FROM "SalesOrder"
        WHERE "companyId" = ${companyId}::uuid AND "orderDate" >= ${period.start} AND "orderDate" < ${period.endExclusive}
          AND (${warehouse}::uuid IS NULL OR "warehouseId" = ${warehouse}::uuid)
        GROUP BY status ORDER BY status
      `),
        this.salesSeries(companyId, period, warehouse),
        this.prisma.$queryRaw<RankingRow[]>(Prisma.sql`
        SELECT p.id, i."productName" name, i."productSku" sku, i."unitSymbol",
               SUM(i.quantity) quantity, SUM(i.subtotal) amount
        FROM "SalesOrderItem" i JOIN "SalesOrder" o ON o.id = i."salesOrderId" AND o."companyId" = i."companyId"
        JOIN "Product" p ON p.id = i."productId" AND p."companyId" = i."companyId"
        WHERE o."companyId" = ${companyId}::uuid AND o.status IN ('CONFIRMED','RESERVED','SHIPPED')
          AND o."orderDate" >= ${period.start} AND o."orderDate" < ${period.endExclusive}
          AND (${warehouse}::uuid IS NULL OR o."warehouseId" = ${warehouse}::uuid)
        GROUP BY p.id, i."productName", i."productSku", i."unitSymbol"
        ORDER BY amount DESC LIMIT 5
      `),
      ]);
    const current = currentRows[0] ?? { count: 0n, amount: new Prisma.Decimal(0) };
    const previous = previousRows[0] ?? { count: 0n, amount: new Prisma.Decimal(0) };
    const currentAmount = current.amount ?? new Prisma.Decimal(0);
    const previousAmount = previous.amount ?? new Prisma.Decimal(0);
    const count = Number(current.count);
    return {
      ordersCount: count,
      grossSalesAmount: currentAmount.toFixed(2),
      averageOrderValue: (count ? currentAmount.div(count) : new Prisma.Decimal(0)).toFixed(2),
      itemsSoldQuantity: units.map((row) => ({
        unitSymbol: row.unitSymbol,
        quantity: row.quantity.toFixed(4),
      })),
      comparison: {
        previousOrdersCount: Number(previous.count),
        previousGrossSalesAmount: previousAmount.toFixed(2),
        changePercentage: this.change(currentAmount, previousAmount),
      },
      statusDistribution: statusGroups.map((row) => ({
        status: row.status,
        count: Number(row.count),
      })),
      series: series.map((row) => ({
        period: this.bucket(row.bucket, period.groupBy),
        ordersCount: Number(row.count),
        amount: row.amount.toFixed(2),
      })),
      topProducts: topProducts.map((row) => ({
        ...row,
        quantity: row.quantity.toFixed(4),
        amount: row.amount.toFixed(2),
      })),
    };
  }

  private salesAggregate(companyId: string, start: Date, end: Date, warehouseId: string | null) {
    return this.prisma.$queryRaw<NumericAggregate[]>(Prisma.sql`
      SELECT COUNT(*) count, COALESCE(SUM("totalAmount"), 0) amount FROM "SalesOrder"
      WHERE "companyId" = ${companyId}::uuid AND status IN ('CONFIRMED','RESERVED','SHIPPED')
        AND "orderDate" >= ${start} AND "orderDate" < ${end}
        AND (${warehouseId}::uuid IS NULL OR "warehouseId" = ${warehouseId}::uuid)
    `);
  }

  private salesSeries(companyId: string, period: Period, warehouseId: string | null) {
    const trunc = period.groupBy === 'day' ? Prisma.sql`'day'` : Prisma.sql`'month'`;
    return this.prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
      SELECT date_trunc(${trunc}, "orderDate") bucket, COUNT(*) count, SUM("totalAmount") amount
      FROM "SalesOrder" WHERE "companyId" = ${companyId}::uuid AND status IN ('CONFIRMED','RESERVED','SHIPPED')
        AND "orderDate" >= ${period.start} AND "orderDate" < ${period.endExclusive}
        AND (${warehouseId}::uuid IS NULL OR "warehouseId" = ${warehouseId}::uuid)
      GROUP BY bucket ORDER BY bucket
    `);
  }

  private async purchasesSummary(companyId: string, period: Period, warehouseId?: string) {
    const warehouse = warehouseId ?? null;
    const where = {
      companyId,
      createdAt: { gte: period.start, lt: period.endExclusive },
      ...(warehouseId ? { warehouseId } : {}),
    };
    const [orders, approved, receipts, pending] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.aggregate({
        where,
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { ...where, status: { in: APPROVED_PURCHASES } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.$queryRaw<NumericAggregate[]>(Prisma.sql`
        SELECT COUNT(DISTINCT r.id) count, COALESCE(SUM(i."receivedQuantity" * i."unitCost"), 0) amount
        FROM "PurchaseReceipt" r JOIN "PurchaseReceiptItem" i ON i."purchaseReceiptId" = r.id AND i."companyId" = r."companyId"
        JOIN "PurchaseOrder" o ON o.id = r."purchaseOrderId" AND o."companyId" = r."companyId"
        WHERE r."companyId" = ${companyId}::uuid AND r."receivedAt" >= ${period.start} AND r."receivedAt" < ${period.endExclusive}
          AND (${warehouse}::uuid IS NULL OR o."warehouseId" = ${warehouse}::uuid)
      `),
      this.prisma.purchaseOrder.count({
        where: {
          companyId,
          status: { in: PENDING_RECEIPT },
          ...(warehouseId ? { warehouseId } : {}),
          items: {
            some: { receivedQuantity: { lt: this.prisma.purchaseOrderItem.fields.quantity } },
          },
        },
      }),
    ]);
    const receipt = receipts[0] ?? { count: 0n, amount: new Prisma.Decimal(0) };
    return {
      ordersCount: orders._count._all,
      ordersAmount: (orders._sum.totalAmount ?? new Prisma.Decimal(0)).toFixed(2),
      approvedOrdersCount: approved._count._all,
      approvedPurchasesAmount: (approved._sum.totalAmount ?? new Prisma.Decimal(0)).toFixed(2),
      receiptsCount: Number(receipt.count),
      receivedAmount: (receipt.amount ?? new Prisma.Decimal(0)).toFixed(2),
      pendingReceiptsCount: pending,
    };
  }

  private async inventorySummary(
    companyId: string,
    includeMovements: boolean,
    warehouseId?: string,
  ) {
    const warehouse = warehouseId ?? null;
    const rows = await this.prisma.$queryRaw<InventorySummaryRow[]>(Prisma.sql`
      WITH physical AS (
        SELECT b."productId", SUM(b.quantity) quantity FROM "InventoryBalance" b
        JOIN "StockLocation" l ON l.id = b."locationId" AND l."companyId" = b."companyId"
        WHERE b."companyId" = ${companyId}::uuid AND (${warehouse}::uuid IS NULL OR l."warehouseId" = ${warehouse}::uuid)
        GROUP BY b."productId"
      ), reserved AS (
        SELECT r."productId", SUM(r.quantity) quantity FROM "StockReservation" r
        JOIN "StockLocation" l ON l.id = r."locationId" AND l."companyId" = r."companyId"
        WHERE r."companyId" = ${companyId}::uuid AND r.status = 'ACTIVE'::"StockReservationStatus"
          AND (${warehouse}::uuid IS NULL OR l."warehouseId" = ${warehouse}::uuid)
        GROUP BY r."productId"
      ), position AS (
        SELECT p.id, p."minimumStock", COALESCE(ph.quantity, 0) - COALESCE(re.quantity, 0) available
        FROM "Product" p LEFT JOIN physical ph ON ph."productId" = p.id LEFT JOIN reserved re ON re."productId" = p.id
        WHERE p."companyId" = ${companyId}::uuid AND p."isActive" = true
      )
      SELECT COUNT(*) "productsCount", COUNT(*) FILTER (WHERE available > 0) "productsWithStock",
             COUNT(*) FILTER (WHERE available <= 0) "productsWithoutStock",
             COUNT(*) FILTER (WHERE "minimumStock" > 0 AND available > 0 AND available <= "minimumStock") "lowStockProducts",
             (SELECT COUNT(*) FROM "StockReservation" sr JOIN "StockLocation" sl ON sl.id = sr."locationId" AND sl."companyId" = sr."companyId"
               WHERE sr."companyId" = ${companyId}::uuid AND sr.status = 'ACTIVE'::"StockReservationStatus"
                 AND (${warehouse}::uuid IS NULL OR sl."warehouseId" = ${warehouse}::uuid)) "activeReservations",
             (SELECT COUNT(DISTINCT sr."salesOrderId") FROM "StockReservation" sr JOIN "StockLocation" sl ON sl.id = sr."locationId" AND sl."companyId" = sr."companyId"
               WHERE sr."companyId" = ${companyId}::uuid AND sr.status = 'ACTIVE'::"StockReservationStatus"
                 AND (${warehouse}::uuid IS NULL OR sl."warehouseId" = ${warehouse}::uuid)) "reservedOrders"
      FROM position
    `);
    const row = rows[0] ?? {
      productsCount: 0n,
      productsWithStock: 0n,
      productsWithoutStock: 0n,
      lowStockProducts: 0n,
      activeReservations: 0n,
      reservedOrders: 0n,
    };
    const recentMovements = includeMovements
      ? await this.prisma.stockMovement.findMany({
          where: {
            companyId,
            ...(warehouseId
              ? {
                  OR: [
                    { sourceLocation: { warehouseId } },
                    { destinationLocation: { warehouseId } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            type: true,
            quantity: true,
            createdAt: true,
            product: {
              select: { id: true, name: true, sku: true, unit: { select: { symbol: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : null;
    return {
      productsCount: Number(row.productsCount),
      productsWithStock: Number(row.productsWithStock),
      productsWithoutStock: Number(row.productsWithoutStock),
      lowStockProducts: Number(row.lowStockProducts),
      activeReservations: Number(row.activeReservations),
      reservedOrders: Number(row.reservedOrders),
      recentMovements:
        recentMovements?.map((item) => ({
          ...item,
          quantity: item.quantity.toFixed(4),
          createdAt: item.createdAt.toISOString(),
          unitSymbol: item.product.unit.symbol,
        })) ?? null,
    };
  }

  private period(query: AnalyticsPeriodQueryDto): Period {
    const today = new Date();
    const endDate = query.endDate ?? today.toISOString().slice(0, 10);
    const defaultStart = new Date(`${endDate}T00:00:00.000Z`);
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
    const startDate = query.startDate ?? this.isoDate(defaultStart);
    const start = this.parseDate(startDate);
    const endInclusive = this.parseDate(endDate);
    if (start > endInclusive)
      throw new BadRequestException({
        code: 'INVALID_PERIOD',
        message: 'A data inicial deve ser anterior ou igual à data final.',
      });
    const days = Math.round((endInclusive.getTime() - start.getTime()) / 86_400_000) + 1;
    if (days > 366)
      throw new BadRequestException({
        code: 'PERIOD_TOO_LONG',
        message: 'O período máximo é de 366 dias.',
      });
    const endExclusive = new Date(endInclusive);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const previousEndExclusive = new Date(start);
    const previousStart = new Date(start);
    previousStart.setUTCDate(previousStart.getUTCDate() - days);
    const previousEnd = new Date(start);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    return {
      startDate,
      endDate,
      start,
      endExclusive,
      previousStart,
      previousEndExclusive,
      previousStartDate: this.isoDate(previousStart),
      previousEndDate: this.isoDate(previousEnd),
      groupBy: days <= 90 ? 'day' : 'month',
    };
  }

  private parseDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException({ code: 'INVALID_DATE', message: 'Data inválida.' });
    return date;
  }
  private isoDate(value: Date) {
    return value.toISOString().slice(0, 10);
  }
  private bucket(value: Date, groupBy: 'day' | 'month') {
    return groupBy === 'day' ? this.isoDate(value) : this.isoDate(value).slice(0, 7);
  }
  private periodResponse(period: Period) {
    return {
      startDate: period.startDate,
      endDate: period.endDate,
      previousStartDate: period.previousStartDate,
      previousEndDate: period.previousEndDate,
      groupBy: period.groupBy,
      timezone: 'UTC',
    };
  }
  private change(current: Prisma.Decimal, previous: Prisma.Decimal) {
    return previous.isZero()
      ? null
      : current.sub(previous).div(previous).mul(100).toDecimalPlaces(2).toNumber();
  }
  private meta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }
}
