import { z } from 'zod';
import { normalizeDecimal } from '../../../lib/decimal';

const positiveMoney = z
  .string()
  .transform(normalizeDecimal)
  .refine(
    (value) => /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value) && Number(value) > 0,
    'Informe um valor maior que zero com até duas casas.',
  );

export const financialEntrySchema = z
  .object({
    description: z.string().trim().min(2, 'Informe a descrição.').max(200),
    documentNumber: z.string().trim().max(100),
    partyId: z.string(),
    issueDate: z.string().min(1, 'Informe a emissão.'),
    dueDate: z.string().min(1, 'Informe o vencimento.'),
    originalAmount: positiveMoney,
    notes: z.string().trim().max(2000),
  })
  .refine((value) => value.dueDate >= value.issueDate, {
    path: ['dueDate'],
    message: 'O vencimento não pode anteceder a emissão.',
  });

export const settlementSchema = z.object({
  amount: positiveMoney,
  settledAt: z.string().min(1),
  paymentMethod: z.enum([
    'CASH',
    'BANK_TRANSFER',
    'PIX',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'BANK_SLIP',
    'CHECK',
    'OTHER',
  ]),
  notes: z.string().trim().max(1000),
});
export type FinancialEntryFormValues = z.input<typeof financialEntrySchema>;
export type SettlementFormValues = z.input<typeof settlementSchema>;
