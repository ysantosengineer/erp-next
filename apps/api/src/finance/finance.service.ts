import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialReferenceType,
  Prisma,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CashFlowGroupBy,
  CashFlowQueryDto,
  CashFlowView,
  CreateFinancialEntryDto,
  CreateFinancialSettlementDto,
  FinanceSummaryQueryDto,
  ListFinancialEntriesQueryDto,
  UpdateFinancialEntryDto,
} from './dto/finance.dto';

const entryInclude = {
  supplier: { select: { id: true, name: true, document: true, isActive: true } },
  customer: { select: { id: true, name: true, document: true, isActive: true } },
  createdBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
  settlements: {
    orderBy: [{ settlementDate: 'asc' as const }, { createdAt: 'asc' as const }],
    include: { createdBy: { select: { id: true, name: true } } },
  },
} satisfies Prisma.FinancialEntryInclude;

type Entry = Prisma.FinancialEntryGetPayload<{ include: typeof entryInclude }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async options(identity: AuthenticatedUser) {
    const [suppliers, customers] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where: { companyId: identity.companyId, isActive: true },
        select: { id: true, name: true, document: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
      this.prisma.customer.findMany({
        where: { companyId: identity.companyId, isActive: true },
        select: { id: true, name: true, document: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
    ]);
    return { suppliers, customers };
  }

  async findAll(identity: AuthenticatedUser, query: ListFinancialEntriesQueryDto) {
    this.validateRange(query.startDueDate, query.endDueDate);
    const today = this.today();
    const conditions: Prisma.FinancialEntryWhereInput[] = [];
    if (query.startDueDate || query.endDueDate) {
      conditions.push({
        dueDate: {
          ...(query.startDueDate ? { gte: this.date(query.startDueDate) } : {}),
          ...(query.endDueDate ? { lte: this.date(query.endDueDate) } : {}),
        },
      });
    }
    if (query.overdue === true) {
      conditions.push({
        dueDate: { lt: today },
        status: { in: [FinancialEntryStatus.OPEN, FinancialEntryStatus.PARTIALLY_SETTLED] },
      });
    } else if (query.overdue === false) {
      conditions.push({
        OR: [
          { dueDate: { gte: today } },
          { status: { in: [FinancialEntryStatus.SETTLED, FinancialEntryStatus.CANCELLED] } },
        ],
      });
    }
    if (query.search) {
      conditions.push({
        OR: [
          { number: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { documentNumber: { contains: query.search, mode: 'insensitive' } },
          { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }
    const where: Prisma.FinancialEntryWhereInput = {
      companyId: identity.companyId,
      AND: conditions,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        include: entryInclude,
        orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.financialEntry.count({ where }),
    ]);
    return {
      data: data.map((entry) => this.toResponse(entry)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(identity: AuthenticatedUser, id: string) {
    return this.toResponse(await this.getEntry(this.prisma, identity.companyId, id));
  }

  async create(identity: AuthenticatedUser, dto: CreateFinancialEntryDto, requestId: string) {
    this.validateDates(dto.issueDate, dto.dueDate);
    this.positiveAmount(dto.originalAmount);
    return this.withSerializableRetry(async (tx) => {
      await this.validateParties(tx, identity.companyId, dto.type, dto.supplierId, dto.customerId);
      await this.validateReference(
        tx,
        identity.companyId,
        dto.referenceType ?? FinancialReferenceType.MANUAL,
        dto.referenceId,
      );
      const sequence = await tx.$queryRaw<{ lastNumber: number }[]>`
        INSERT INTO "FinancialEntrySequence" ("companyId", "lastNumber", "updatedAt")
        VALUES (${identity.companyId}::uuid, 1, NOW())
        ON CONFLICT ("companyId") DO UPDATE
        SET "lastNumber" = "FinancialEntrySequence"."lastNumber" + 1, "updatedAt" = NOW()
        RETURNING "lastNumber"
      `;
      const entry = await tx.financialEntry.create({
        data: {
          companyId: identity.companyId,
          number: `FIN-${String(sequence[0].lastNumber).padStart(6, '0')}`,
          type: dto.type,
          description: dto.description.trim(),
          documentNumber: dto.documentNumber?.trim() || null,
          supplierId: dto.supplierId || null,
          customerId: dto.customerId || null,
          issueDate: this.date(dto.issueDate),
          dueDate: this.date(dto.dueDate),
          originalAmount: new Prisma.Decimal(dto.originalAmount),
          notes: dto.notes?.trim() || null,
          referenceType: dto.referenceType ?? FinancialReferenceType.MANUAL,
          referenceId: dto.referenceId || null,
          createdByUserId: identity.userId,
        },
        include: entryInclude,
      });
      await this.audit(tx, identity, entry.id, 'CREATED', requestId, null, this.snapshot(entry));
      return this.toResponse(entry);
    });
  }

  async update(
    identity: AuthenticatedUser,
    id: string,
    dto: UpdateFinancialEntryDto,
    requestId: string,
  ) {
    return this.withSerializableRetry(async (tx) => {
      await this.lockEntry(tx, identity.companyId, id);
      const current = await this.getEntry(tx, identity.companyId, id);
      if (current.status !== FinancialEntryStatus.OPEN || !current.settledAmount.isZero()) {
        throw new ConflictException({
          code: 'FINANCIAL_ENTRY_NOT_EDITABLE',
          message: 'Somente títulos em aberto e sem liquidações podem ser editados.',
        });
      }
      const issueDate = dto.issueDate ?? this.isoDate(current.issueDate);
      const dueDate = dto.dueDate ?? this.isoDate(current.dueDate);
      this.validateDates(issueDate, dueDate);
      if (dto.originalAmount !== undefined) this.positiveAmount(dto.originalAmount);
      const supplierId = dto.supplierId === undefined ? current.supplierId : dto.supplierId;
      const customerId = dto.customerId === undefined ? current.customerId : dto.customerId;
      const referenceType = dto.referenceType ?? current.referenceType;
      const referenceId = dto.referenceId === undefined ? current.referenceId : dto.referenceId;
      await this.validateParties(
        tx,
        identity.companyId,
        current.type,
        supplierId,
        customerId,
        dto.supplierId !== undefined,
        dto.customerId !== undefined,
      );
      await this.validateReference(tx, identity.companyId, referenceType, referenceId);
      const updated = await tx.financialEntry.update({
        where: { id },
        data: {
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.documentNumber !== undefined
            ? { documentNumber: dto.documentNumber?.trim() || null }
            : {}),
          ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId || null } : {}),
          ...(dto.customerId !== undefined ? { customerId: dto.customerId || null } : {}),
          ...(dto.issueDate !== undefined ? { issueDate: this.date(dto.issueDate) } : {}),
          ...(dto.dueDate !== undefined ? { dueDate: this.date(dto.dueDate) } : {}),
          ...(dto.originalAmount !== undefined
            ? { originalAmount: new Prisma.Decimal(dto.originalAmount) }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
          ...(dto.referenceType !== undefined ? { referenceType: dto.referenceType } : {}),
          ...(dto.referenceId !== undefined ? { referenceId: dto.referenceId || null } : {}),
        },
        include: entryInclude,
      });
      await this.audit(
        tx,
        identity,
        id,
        'UPDATED',
        requestId,
        this.snapshot(current),
        this.snapshot(updated),
      );
      return this.toResponse(updated);
    });
  }

  async settle(
    identity: AuthenticatedUser,
    id: string,
    dto: CreateFinancialSettlementDto,
    requestId: string,
  ) {
    const amount = this.positiveAmount(dto.amount);
    const requestHash = this.hash({
      entryId: id,
      amount: amount.toFixed(2),
      settledAt: dto.settledAt,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes?.trim() || null,
    });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const existing = await tx.financialSettlement.findUnique({
              where: {
                companyId_idempotencyKey: {
                  companyId: identity.companyId,
                  idempotencyKey: dto.idempotencyKey,
                },
              },
            });
            if (existing)
              return this.resolveSettlementRetry(tx, identity.companyId, existing, requestHash);
            await this.lockEntry(tx, identity.companyId, id);
            const entry = await this.getEntry(tx, identity.companyId, id);
            if (
              entry.status === FinancialEntryStatus.CANCELLED ||
              entry.status === FinancialEntryStatus.SETTLED
            ) {
              throw new UnprocessableEntityException({
                code: 'FINANCIAL_ENTRY_NOT_SETTLEABLE',
                message: 'O título não aceita novas liquidações.',
              });
            }
            const remaining = entry.originalAmount.sub(entry.settledAmount);
            if (amount.gt(remaining)) {
              throw new UnprocessableEntityException({
                code: 'FINANCIAL_OVERPAYMENT',
                message: 'O valor da liquidação excede o saldo pendente.',
              });
            }
            const nextSettled = entry.settledAmount.add(amount);
            const nextStatus = nextSettled.eq(entry.originalAmount)
              ? FinancialEntryStatus.SETTLED
              : FinancialEntryStatus.PARTIALLY_SETTLED;
            const settlement = await tx.financialSettlement.create({
              data: {
                companyId: identity.companyId,
                financialEntryId: id,
                amount,
                settlementDate: this.date(dto.settledAt),
                paymentMethod: dto.paymentMethod,
                notes: dto.notes?.trim() || null,
                idempotencyKey: dto.idempotencyKey,
                requestHash,
                createdByUserId: identity.userId,
              },
            });
            await tx.financialEntry.update({
              where: { id },
              data: { settledAmount: nextSettled, status: nextStatus },
            });
            await this.audit(
              tx,
              identity,
              id,
              entry.type === FinancialEntryType.PAYABLE ? 'PAYMENT_RECORDED' : 'RECEIPT_RECORDED',
              requestId,
              this.snapshot(entry),
              {
                settlementId: settlement.id,
                amount: amount.toFixed(2),
                settledAmount: nextSettled.toFixed(2),
                status: nextStatus,
              },
            );
            return {
              settlement: this.settlementResponse(settlement),
              entry: this.toResponse(await this.getEntry(tx, identity.companyId, id)),
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        )
          continue;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const existing = await this.prisma.financialSettlement.findUnique({
            where: {
              companyId_idempotencyKey: {
                companyId: identity.companyId,
                idempotencyKey: dto.idempotencyKey,
              },
            },
          });
          if (existing)
            return this.resolveSettlementRetry(
              this.prisma,
              identity.companyId,
              existing,
              requestHash,
            );
        }
        throw error;
      }
    }
    throw new ConflictException({
      code: 'FINANCIAL_SETTLEMENT_CONCURRENCY_CONFLICT',
      message: 'O saldo foi alterado por outra operação. Atualize e tente novamente.',
    });
  }

  async cancel(
    identity: AuthenticatedUser,
    id: string,
    dto: { reason: string },
    requestId: string,
  ) {
    return this.withSerializableRetry(async (tx) => {
      await this.lockEntry(tx, identity.companyId, id);
      const entry = await this.getEntry(tx, identity.companyId, id);
      if (entry.status === FinancialEntryStatus.CANCELLED) return this.toResponse(entry);
      if (!entry.settledAmount.isZero()) {
        throw new ConflictException({
          code: 'FINANCIAL_ENTRY_HAS_SETTLEMENTS',
          message:
            'Título com liquidação não pode ser cancelado; será necessário estorno em etapa futura.',
        });
      }
      const updated = await tx.financialEntry.update({
        where: { id },
        data: {
          status: FinancialEntryStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledByUserId: identity.userId,
          cancellationReason: dto.reason.trim(),
        },
        include: entryInclude,
      });
      await this.audit(
        tx,
        identity,
        id,
        'CANCELLED',
        requestId,
        this.snapshot(entry),
        this.snapshot(updated),
      );
      return this.toResponse(updated);
    });
  }

  async cashFlow(identity: AuthenticatedUser, query: CashFlowQueryDto) {
    this.validateRange(query.startDate, query.endDate);
    const start = this.date(query.startDate);
    const end = this.date(query.endDate);
    const buckets = new Map<
      string,
      {
        date: string;
        forecastReceivables: Prisma.Decimal;
        forecastPayables: Prisma.Decimal;
        realizedReceivables: Prisma.Decimal;
        realizedPayables: Prisma.Decimal;
      }
    >();
    const bucket = (date: Date) => {
      const key =
        query.groupBy === CashFlowGroupBy.MONTH
          ? this.isoDate(date).slice(0, 7)
          : this.isoDate(date);
      let value = buckets.get(key);
      if (!value) {
        value = {
          date: key,
          forecastReceivables: new Prisma.Decimal(0),
          forecastPayables: new Prisma.Decimal(0),
          realizedReceivables: new Prisma.Decimal(0),
          realizedPayables: new Prisma.Decimal(0),
        };
        buckets.set(key, value);
      }
      return value;
    };
    if (query.view !== CashFlowView.REALIZED) {
      const entries = await this.prisma.financialEntry.findMany({
        where: {
          companyId: identity.companyId,
          status: { in: [FinancialEntryStatus.OPEN, FinancialEntryStatus.PARTIALLY_SETTLED] },
          dueDate: { gte: start, lte: end },
        },
        select: { type: true, dueDate: true, originalAmount: true, settledAmount: true },
      });
      for (const entry of entries) {
        const item = bucket(entry.dueDate);
        const remaining = entry.originalAmount.sub(entry.settledAmount);
        if (entry.type === FinancialEntryType.RECEIVABLE)
          item.forecastReceivables = item.forecastReceivables.add(remaining);
        else item.forecastPayables = item.forecastPayables.add(remaining);
      }
    }
    if (query.view !== CashFlowView.FORECAST) {
      const settlements = await this.prisma.financialSettlement.findMany({
        where: { companyId: identity.companyId, settlementDate: { gte: start, lte: end } },
        select: { amount: true, settlementDate: true, financialEntry: { select: { type: true } } },
      });
      for (const settlement of settlements) {
        const item = bucket(settlement.settlementDate);
        if (settlement.financialEntry.type === FinancialEntryType.RECEIVABLE)
          item.realizedReceivables = item.realizedReceivables.add(settlement.amount);
        else item.realizedPayables = item.realizedPayables.add(settlement.amount);
      }
    }
    return {
      view: query.view,
      groupBy: query.groupBy,
      startDate: query.startDate,
      endDate: query.endDate,
      data: [...buckets.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => ({
          date: item.date,
          forecast: {
            receivables: item.forecastReceivables.toFixed(2),
            payables: item.forecastPayables.toFixed(2),
            net: item.forecastReceivables.sub(item.forecastPayables).toFixed(2),
          },
          realized: {
            receivables: item.realizedReceivables.toFixed(2),
            payables: item.realizedPayables.toFixed(2),
            net: item.realizedReceivables.sub(item.realizedPayables).toFixed(2),
          },
        })),
    };
  }

  async summary(identity: AuthenticatedUser, query: FinanceSummaryQueryDto) {
    this.validateRange(query.startDate, query.endDate);
    const today = this.today();
    const [entries, settlements] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where: {
          companyId: identity.companyId,
          status: { in: [FinancialEntryStatus.OPEN, FinancialEntryStatus.PARTIALLY_SETTLED] },
        },
        select: { type: true, dueDate: true, originalAmount: true, settledAmount: true },
      }),
      this.prisma.financialSettlement.findMany({
        where: {
          companyId: identity.companyId,
          settlementDate: { gte: this.date(query.startDate), lte: this.date(query.endDate) },
        },
        select: { amount: true, financialEntry: { select: { type: true } } },
      }),
    ]);
    let totalReceivableOpen = new Prisma.Decimal(0),
      totalPayableOpen = new Prisma.Decimal(0),
      overdueReceivables = new Prisma.Decimal(0),
      overduePayables = new Prisma.Decimal(0),
      receivedInPeriod = new Prisma.Decimal(0),
      paidInPeriod = new Prisma.Decimal(0);
    for (const entry of entries) {
      const remaining = entry.originalAmount.sub(entry.settledAmount);
      if (entry.type === FinancialEntryType.RECEIVABLE) {
        totalReceivableOpen = totalReceivableOpen.add(remaining);
        if (entry.dueDate < today) overdueReceivables = overdueReceivables.add(remaining);
      } else {
        totalPayableOpen = totalPayableOpen.add(remaining);
        if (entry.dueDate < today) overduePayables = overduePayables.add(remaining);
      }
    }
    for (const settlement of settlements) {
      if (settlement.financialEntry.type === FinancialEntryType.RECEIVABLE)
        receivedInPeriod = receivedInPeriod.add(settlement.amount);
      else paidInPeriod = paidInPeriod.add(settlement.amount);
    }
    return {
      totalReceivableOpen: totalReceivableOpen.toFixed(2),
      totalPayableOpen: totalPayableOpen.toFixed(2),
      overdueReceivables: overdueReceivables.toFixed(2),
      overduePayables: overduePayables.toFixed(2),
      receivedInPeriod: receivedInPeriod.toFixed(2),
      paidInPeriod: paidInPeriod.toFixed(2),
    };
  }

  private async resolveSettlementRetry(
    client: Tx | PrismaService,
    companyId: string,
    settlement: {
      id: string;
      financialEntryId: string;
      requestHash: string;
      amount: Prisma.Decimal;
      settlementDate: Date;
      paymentMethod: string;
      notes: string | null;
      createdAt: Date;
    },
    requestHash: string,
  ) {
    if (settlement.requestHash !== requestHash)
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_REUSED',
        message: 'A chave de idempotência já foi utilizada com outro conteúdo.',
      });
    return {
      settlement: this.settlementResponse(settlement),
      entry: this.toResponse(await this.getEntry(client, companyId, settlement.financialEntryId)),
      idempotentReplay: true,
    };
  }

  private async validateParties(
    tx: Tx,
    companyId: string,
    type: FinancialEntryType,
    supplierId?: string | null,
    customerId?: string | null,
    requireActiveSupplier = true,
    requireActiveCustomer = true,
  ) {
    if (type === FinancialEntryType.PAYABLE && customerId)
      this.invalidParty('Conta a pagar não pode possuir cliente.');
    if (type === FinancialEntryType.RECEIVABLE && supplierId)
      this.invalidParty('Conta a receber não pode possuir fornecedor.');
    if (supplierId) {
      const supplier = await tx.supplier.findFirst({
        where: { id: supplierId, companyId },
        select: { isActive: true },
      });
      if (!supplier)
        throw new NotFoundException({
          code: 'SUPPLIER_NOT_FOUND',
          message: 'Fornecedor não encontrado.',
        });
      if (requireActiveSupplier && !supplier.isActive)
        this.invalidParty('Fornecedor inativo não pode ser vinculado a novo título.');
    }
    if (customerId) {
      const customer = await tx.customer.findFirst({
        where: { id: customerId, companyId },
        select: { isActive: true },
      });
      if (!customer)
        throw new NotFoundException({
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Cliente não encontrado.',
        });
      if (requireActiveCustomer && !customer.isActive)
        this.invalidParty('Cliente inativo não pode ser vinculado a novo título.');
    }
  }

  private async validateReference(
    tx: Tx,
    companyId: string,
    type: FinancialReferenceType,
    id?: string | null,
  ) {
    if (type === FinancialReferenceType.MANUAL && id)
      throw new UnprocessableEntityException({
        code: 'INVALID_FINANCIAL_REFERENCE',
        message: 'Referência manual não deve possuir ID.',
      });
    const isInternalReference =
      type === FinancialReferenceType.PURCHASE_ORDER ||
      type === FinancialReferenceType.PURCHASE_RECEIPT ||
      type === FinancialReferenceType.SALES_ORDER;
    if (isInternalReference && !id)
      throw new UnprocessableEntityException({
        code: 'FINANCIAL_REFERENCE_REQUIRED',
        message: 'O ID do documento de origem é obrigatório.',
      });
    if (!id || type === FinancialReferenceType.OTHER) return;
    const found =
      type === FinancialReferenceType.PURCHASE_ORDER
        ? await tx.purchaseOrder.findFirst({ where: { id, companyId }, select: { id: true } })
        : type === FinancialReferenceType.PURCHASE_RECEIPT
          ? await tx.purchaseReceipt.findFirst({ where: { id, companyId }, select: { id: true } })
          : await tx.salesOrder.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!found)
      throw new NotFoundException({
        code: 'FINANCIAL_REFERENCE_NOT_FOUND',
        message: 'Documento de origem não encontrado.',
      });
  }

  private async lockEntry(tx: Tx, companyId: string, id: string) {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "FinancialEntry" WHERE "id" = ${id}::uuid AND "companyId" = ${companyId}::uuid FOR UPDATE`;
    if (!rows.length) this.notFound();
  }

  private async getEntry(
    client: Tx | PrismaService,
    companyId: string,
    id: string,
  ): Promise<Entry> {
    const entry = await client.financialEntry.findFirst({
      where: { id, companyId },
      include: entryInclude,
    });
    if (!entry) this.notFound();
    return entry;
  }

  private async withSerializableRetry<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
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
        )
          continue;
        throw error;
      }
    }
    throw new ConflictException({
      code: 'FINANCIAL_CONCURRENCY_CONFLICT',
      message: 'Os dados foram alterados por outra operação. Tente novamente.',
    });
  }

  private toResponse(entry: Entry) {
    const remaining = entry.originalAmount.sub(entry.settledAmount);
    const today = this.today();
    const overdue =
      entry.status !== FinancialEntryStatus.CANCELLED && remaining.gt(0) && entry.dueDate < today;
    return {
      id: entry.id,
      number: entry.number,
      type: entry.type,
      status: entry.status,
      description: entry.description,
      documentNumber: entry.documentNumber,
      supplier: entry.supplier,
      customer: entry.customer,
      issueDate: this.isoDate(entry.issueDate),
      dueDate: this.isoDate(entry.dueDate),
      originalAmount: entry.originalAmount.toFixed(2),
      settledAmount: entry.settledAmount.toFixed(2),
      remainingAmount: remaining.toFixed(2),
      overdue,
      daysOverdue: overdue
        ? Math.floor((today.getTime() - entry.dueDate.getTime()) / 86_400_000)
        : 0,
      notes: entry.notes,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      createdBy: entry.createdBy,
      cancelledBy: entry.cancelledBy,
      cancelledAt: entry.cancelledAt?.toISOString() ?? null,
      cancellationReason: entry.cancellationReason,
      settlements: entry.settlements.map((item) => ({
        ...this.settlementResponse(item),
        createdBy: item.createdBy,
      })),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  private settlementResponse(settlement: {
    id: string;
    amount: Prisma.Decimal;
    settlementDate: Date;
    paymentMethod: string;
    notes: string | null;
    createdAt: Date;
  }) {
    return {
      id: settlement.id,
      amount: settlement.amount.toFixed(2),
      settledAt: this.isoDate(settlement.settlementDate),
      paymentMethod: settlement.paymentMethod,
      notes: settlement.notes,
      createdAt: settlement.createdAt.toISOString(),
    };
  }

  private snapshot(entry: Entry) {
    return {
      number: entry.number,
      type: entry.type,
      status: entry.status,
      originalAmount: entry.originalAmount.toFixed(2),
      settledAmount: entry.settledAmount.toFixed(2),
      dueDate: this.isoDate(entry.dueDate),
      supplierId: entry.supplierId,
      customerId: entry.customerId,
    };
  }
  private async audit(
    tx: Tx,
    identity: AuthenticatedUser,
    entityId: string,
    action: string,
    requestId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown>,
  ) {
    await tx.auditLog.create({
      data: {
        companyId: identity.companyId,
        actorId: identity.userId,
        entity: 'FinancialEntry',
        entityId,
        action,
        before: before ? (before as Prisma.InputJsonObject) : Prisma.JsonNull,
        after: after as Prisma.InputJsonObject,
        requestId,
      },
    });
  }
  private positiveAmount(value: string) {
    const amount = new Prisma.Decimal(value);
    if (amount.lte(0))
      throw new UnprocessableEntityException({
        code: 'INVALID_FINANCIAL_AMOUNT',
        message: 'O valor deve ser maior que zero.',
      });
    return amount;
  }
  private validateDates(issue: string, due: string) {
    if (this.date(due) < this.date(issue))
      throw new UnprocessableEntityException({
        code: 'INVALID_FINANCIAL_DATES',
        message: 'O vencimento não pode ser anterior à emissão.',
      });
  }
  private validateRange(start?: string, end?: string) {
    if (start && end && this.date(end) < this.date(start))
      throw new UnprocessableEntityException({
        code: 'INVALID_DATE_RANGE',
        message: 'A data final não pode ser anterior à inicial.',
      });
  }
  private date(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  private today() {
    const value = new Date();
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  private isoDate(value: Date) {
    return value.toISOString().slice(0, 10);
  }
  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
  private invalidParty(message: string): never {
    throw new UnprocessableEntityException({ code: 'INVALID_FINANCIAL_PARTY', message });
  }
  private notFound(): never {
    throw new NotFoundException({
      code: 'FINANCIAL_ENTRY_NOT_FOUND',
      message: 'Título financeiro não encontrado.',
    });
  }
}
