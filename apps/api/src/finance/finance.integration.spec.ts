import { FinancialEntryStatus, FinancialPaymentMethod } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CashFlowGroupBy, CashFlowView, FinancialSortField, SortOrder } from './dto/finance.dto';
import { FinanceService } from './finance.service';

const describeDatabase = process.env.RUN_FINANCE_INTEGRATION === 'true' ? describe : describe.skip;

describeDatabase('FinanceService PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const service = new FinanceService(prisma);
  const companies: string[] = [];
  let identity: AuthenticatedUser;
  let supplierId: string;
  let customerId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const suffix = randomUUID().slice(0, 8);
    const company = await prisma.company.create({ data: { name: `Finance ${suffix}` } });
    const other = await prisma.company.create({ data: { name: `Other ${suffix}` } });
    companies.push(company.id, other.id);
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Finance operator',
        email: `finance-${suffix}@test.local`,
        passwordHash: 'test-only',
      },
    });
    const supplier = await prisma.supplier.create({
      data: {
        companyId: company.id,
        type: 'COMPANY',
        name: 'Supplier',
        document: `1${Date.now()}`,
      },
    });
    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        type: 'COMPANY',
        name: 'Customer',
        document: `2${Date.now()}`,
      },
    });
    await prisma.supplier.create({
      data: {
        companyId: other.id,
        type: 'COMPANY',
        name: 'Other supplier',
        document: `3${Date.now()}`,
      },
    });
    supplierId = supplier.id;
    customerId = customer.id;
    identity = {
      userId: user.id,
      companyId: company.id,
      companyName: company.name,
      name: user.name,
      email: user.email,
      authVersion: 1,
      roles: [],
      permissions: [],
    };
  });

  afterAll(async () => {
    for (const companyId of companies) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL erp.allow_financial_settlement_mutation = 'on'");
        await tx.auditLog.deleteMany({ where: { companyId } });
        await tx.financialSettlement.deleteMany({ where: { companyId } });
        await tx.financialEntry.deleteMany({ where: { companyId } });
        await tx.financialEntrySequence.deleteMany({ where: { companyId } });
        await tx.supplier.deleteMany({ where: { companyId } });
        await tx.customer.deleteMany({ where: { companyId } });
        await tx.user.deleteMany({ where: { companyId } });
        await tx.company.delete({ where: { id: companyId } });
      });
    }
    await prisma.$disconnect();
  });

  it('cria pagar/receber, deriva saldo e bloqueia parceiro cross-tenant', async () => {
    const payable = await service.create(
      identity,
      {
        type: 'PAYABLE',
        description: 'Compra',
        supplierId,
        issueDate: '2026-08-01',
        dueDate: '2026-08-31',
        originalAmount: '1000.00',
      },
      randomUUID(),
    );
    const receivable = await service.create(
      identity,
      {
        type: 'RECEIVABLE',
        description: 'Venda',
        customerId,
        issueDate: '2026-08-01',
        dueDate: '2026-09-01',
        originalAmount: '500.25',
      },
      randomUUID(),
    );
    expect(payable.number).toMatch(/^FIN-\d{6}$/);
    expect(receivable.remainingAmount).toBe('500.25');
    const foreign = await prisma.supplier.findFirstOrThrow({ where: { companyId: companies[1] } });
    await expect(
      service.create(
        identity,
        {
          type: 'PAYABLE',
          description: 'Inválido',
          supplierId: foreign.id,
          issueDate: '2026-08-01',
          dueDate: '2026-08-02',
          originalAmount: '1.00',
        },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('liquida parcialmente e totalmente, impede overpayment e garante idempotência', async () => {
    const entry = await service.create(
      identity,
      {
        type: 'PAYABLE',
        description: 'Liquidação',
        supplierId,
        issueDate: '2026-08-01',
        dueDate: '2026-08-20',
        originalAmount: '1000.00',
      },
      randomUUID(),
    );
    const key = randomUUID();
    const first = await service.settle(
      identity,
      entry.id,
      {
        amount: '300.00',
        settledAt: '2026-08-10',
        paymentMethod: FinancialPaymentMethod.PIX,
        idempotencyKey: key,
      },
      randomUUID(),
    );
    expect(first.entry.status).toBe(FinancialEntryStatus.PARTIALLY_SETTLED);
    expect(first.entry.remainingAmount).toBe('700.00');
    const replay = await service.settle(
      identity,
      entry.id,
      {
        amount: '300.00',
        settledAt: '2026-08-10',
        paymentMethod: FinancialPaymentMethod.PIX,
        idempotencyKey: key,
      },
      randomUUID(),
    );
    expect(replay).toMatchObject({ idempotentReplay: true });
    await expect(
      service.settle(
        identity,
        entry.id,
        {
          amount: '301.00',
          settledAt: '2026-08-10',
          paymentMethod: FinancialPaymentMethod.PIX,
          idempotencyKey: key,
        },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.settle(
        identity,
        entry.id,
        {
          amount: '701.00',
          settledAt: '2026-08-10',
          paymentMethod: FinancialPaymentMethod.CASH,
          idempotencyKey: randomUUID(),
        },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 422 });
    const final = await service.settle(
      identity,
      entry.id,
      {
        amount: '700.00',
        settledAt: '2026-08-11',
        paymentMethod: FinancialPaymentMethod.BANK_TRANSFER,
        idempotencyKey: randomUUID(),
      },
      randomUUID(),
    );
    expect(final.entry).toMatchObject({
      status: FinancialEntryStatus.SETTLED,
      remainingAmount: '0.00',
    });
  });

  it('serializa duas baixas concorrentes e mantém o total dentro do saldo', async () => {
    const entry = await service.create(
      identity,
      {
        type: 'RECEIVABLE',
        description: 'Concorrência',
        customerId,
        issueDate: '2026-08-01',
        dueDate: '2026-08-30',
        originalAmount: '1000.00',
      },
      randomUUID(),
    );
    const results = await Promise.allSettled([
      service.settle(
        identity,
        entry.id,
        {
          amount: '700.00',
          settledAt: '2026-08-12',
          paymentMethod: FinancialPaymentMethod.PIX,
          idempotencyKey: randomUUID(),
        },
        randomUUID(),
      ),
      service.settle(
        identity,
        entry.id,
        {
          amount: '700.00',
          settledAt: '2026-08-12',
          paymentMethod: FinancialPaymentMethod.PIX,
          idempotencyKey: randomUUID(),
        },
        randomUUID(),
      ),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const stored = await prisma.financialEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(stored.settledAmount.toFixed(2)).toBe('700.00');
  });

  it('calcula fluxo previsto e realizado sem misturar entradas e saídas', async () => {
    const result = await service.cashFlow(identity, {
      startDate: '2026-08-01',
      endDate: '2026-09-30',
      view: CashFlowView.COMBINED,
      groupBy: CashFlowGroupBy.MONTH,
    });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.some((item) => item.forecast.payables !== '0.00')).toBe(true);
    expect(result.data.some((item) => item.realized.receivables !== '0.00')).toBe(true);
  });

  it('filtra títulos vencidos e mantém paginação no servidor', async () => {
    await service.create(
      identity,
      {
        type: 'PAYABLE',
        description: 'Vencido',
        supplierId,
        issueDate: '2026-08-01',
        dueDate: '2026-08-02',
        originalAmount: '10.00',
      },
      randomUUID(),
    );
    const result = await service.findAll(identity, {
      page: 1,
      limit: 20,
      type: 'PAYABLE',
      overdue: true,
      sortBy: FinancialSortField.DUE_DATE,
      sortOrder: SortOrder.ASC,
    });
    expect(result.data.every((entry) => entry.overdue)).toBe(true);
    expect(result.meta.total).toBeGreaterThan(0);
  });

  it('protege liquidações contra alteração e exclusão física no banco', async () => {
    const settlement = await prisma.financialSettlement.findFirstOrThrow({
      where: { companyId: identity.companyId },
    });
    await expect(
      prisma.financialSettlement.update({
        where: { id: settlement.id },
        data: { notes: 'alterado' },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.financialSettlement.delete({ where: { id: settlement.id } }),
    ).rejects.toBeDefined();
  });
});
