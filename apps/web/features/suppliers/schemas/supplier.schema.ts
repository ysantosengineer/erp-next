import { z } from 'zod';
import type { SupplierInput, SupplierType } from '../types/supplier.types';
export const digitsOnly = (value: string) => value.replace(/\D/g, '');
const repeated = (value: string) => /^(\d)\1+$/.test(value);
export function isValidCpf(value: string) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || repeated(cpf)) return false;
  for (let digit = 9; digit < 11; digit += 1) {
    let sum = 0;
    for (let index = 0; index < digit; index += 1) sum += Number(cpf[index]) * (digit + 1 - index);
    if (((sum * 10) % 11) % 10 !== Number(cpf[digit])) return false;
  }
  return true;
}
export function isValidCnpj(value: string) {
  const cnpj = digitsOnly(value);
  if (cnpj.length !== 14 || repeated(cnpj)) return false;
  const calc = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const rem =
      weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0) % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}
export const formatDocument = (value: string) => {
  const digits = digitsOnly(value);
  return digits.length <= 11
    ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};
export const formatPhone = (value: string) =>
  digitsOnly(value)
    .slice(0, 11)
    .replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
export const formatPostalCode = (value: string) =>
  digitsOnly(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d{3})/, '$1-$2');
const optional = (max: number) => z.string().trim().max(max);
export const supplierSchema = z
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
    contactName: optional(120),
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
  .superRefine((values, ctx) => {
    const valid =
      values.type === 'INDIVIDUAL' ? isValidCpf(values.document) : isValidCnpj(values.document);
    if (!valid)
      ctx.addIssue({
        code: 'custom',
        path: ['document'],
        message:
          values.type === 'INDIVIDUAL' ? 'Informe um CPF válido.' : 'Informe um CNPJ válido.',
      });
  });
export type SupplierFormValues = z.infer<typeof supplierSchema>;
export const emptySupplierForm = (type: SupplierType = 'COMPANY'): SupplierFormValues => ({
  type,
  name: '',
  tradeName: '',
  document: '',
  email: '',
  phone: '',
  contactName: '',
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
export function toSupplierInput(values: SupplierFormValues, includeEmpty = false): SupplierInput {
  const opt = (value: string) => value.trim() || undefined;
  const address = values.address;
  const hasAddress = Object.entries(address).some(
    ([key, value]) => key !== 'country' && Boolean(value.trim()),
  );
  const tradeName = opt(values.tradeName),
    email = opt(values.email)?.toLowerCase(),
    phone = opt(digitsOnly(values.phone)),
    contactName = opt(values.contactName),
    notes = opt(values.notes);
  return {
    type: values.type,
    name: values.name.trim(),
    document: digitsOnly(values.document),
    ...(tradeName ? { tradeName } : includeEmpty ? { tradeName: null } : {}),
    ...(email ? { email } : includeEmpty ? { email: null } : {}),
    ...(phone ? { phone } : includeEmpty ? { phone: null } : {}),
    ...(contactName ? { contactName } : includeEmpty ? { contactName: null } : {}),
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
      : {}),
  };
}
