import { z } from 'zod';
import { digitsOnly, isValidCnpj, isValidCpf } from '../../../lib/br-data';
import { formatDecimalPtBr, normalizeDecimal } from '../../../lib/decimal';
import type { Customer, CustomerInput, CustomerType } from '../types/customer.types';

const monetary = /^(?:(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)$/;
const optional = (max: number) => z.string().trim().max(max);

export const customerSchema = z
  .object({
    type: z.enum(['INDIVIDUAL', 'COMPANY']),
    name: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(160),
    tradeName: optional(160),
    document: z.string().min(1, 'Informe o documento.'),
    email: z
      .string()
      .trim()
      .refine((value) => !value || z.email().safeParse(value).success, 'Informe um e-mail válido.'),
    phone: optional(20),
    creditLimit: z.string().trim().regex(monetary, 'Informe um limite de crédito válido.'),
    notes: optional(2000),
    address: z.object({
      postalCode: optional(9).refine(
        (value) => !value || digitsOnly(value).length === 8,
        'Informe um CEP com 8 dígitos.',
      ),
      street: optional(160),
      number: optional(20),
      complement: optional(120),
      district: optional(100),
      city: optional(100),
      state: optional(2).refine(
        (value) => !value || value.length === 2,
        'Informe uma UF com 2 letras.',
      ),
      country: z.string().trim().min(2).max(2),
    }),
  })
  .superRefine((values, context) => {
    const valid =
      values.type === 'INDIVIDUAL' ? isValidCpf(values.document) : isValidCnpj(values.document);
    if (!valid) {
      context.addIssue({
        code: 'custom',
        path: ['document'],
        message:
          values.type === 'INDIVIDUAL' ? 'Informe um CPF válido.' : 'Informe um CNPJ válido.',
      });
    }
    const normalized = normalizeDecimal(values.creditLimit);
    if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) {
      context.addIssue({
        code: 'custom',
        path: ['creditLimit'],
        message: 'O limite deve ter até 12 inteiros e 2 casas decimais.',
      });
    }
  });

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const emptyCustomerForm = (type: CustomerType = 'INDIVIDUAL'): CustomerFormValues => ({
  type,
  name: '',
  tradeName: '',
  document: '',
  email: '',
  phone: '',
  creditLimit: '0,00',
  notes: '',
  address: {
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    country: 'BR',
  },
});

export function customerToForm(customer: Customer): CustomerFormValues {
  return {
    type: customer.type,
    name: customer.name,
    tradeName: customer.tradeName ?? '',
    document: customer.document,
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    creditLimit: formatDecimalPtBr(customer.creditLimit, 2),
    notes: customer.notes ?? '',
    address: {
      postalCode: customer.address?.postalCode ?? '',
      street: customer.address?.street ?? '',
      number: customer.address?.number ?? '',
      complement: customer.address?.complement ?? '',
      district: customer.address?.district ?? '',
      city: customer.address?.city ?? '',
      state: customer.address?.state ?? '',
      country: customer.address?.country ?? 'BR',
    },
  };
}

export function toCustomerInput(values: CustomerFormValues, includeEmpty = false): CustomerInput {
  const opt = (value: string) => value.trim() || undefined;
  const address = values.address;
  const hasAddress = Object.entries(address).some(
    ([key, value]) => key !== 'country' && Boolean(value.trim()),
  );
  const tradeName = opt(values.tradeName);
  const email = opt(values.email)?.toLowerCase();
  const phone = opt(digitsOnly(values.phone));
  const notes = opt(values.notes);
  return {
    type: values.type,
    name: values.name.trim(),
    document: digitsOnly(values.document),
    creditLimit: normalizeDecimal(values.creditLimit),
    ...(tradeName ? { tradeName } : includeEmpty ? { tradeName: null } : {}),
    ...(email ? { email } : includeEmpty ? { email: null } : {}),
    ...(phone ? { phone } : includeEmpty ? { phone: null } : {}),
    ...(notes ? { notes } : includeEmpty ? { notes: null } : {}),
    ...(hasAddress
      ? {
          address: {
            postalCode: opt(digitsOnly(address.postalCode)),
            street: opt(address.street),
            number: opt(address.number),
            complement: opt(address.complement),
            district: opt(address.district),
            city: opt(address.city),
            state: opt(address.state)?.toUpperCase(),
            country: address.country.toUpperCase(),
          },
        }
      : includeEmpty
        ? { address: null }
        : {}),
  };
}
