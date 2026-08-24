import { z } from 'zod';
import type { Warehouse, WarehouseInput } from '../types/warehouse.types';

const code = /^[A-Z0-9][A-Z0-9._/-]*$/;

export const warehouseSchema = z.object({
  name: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(160),
  code: z
    .string()
    .trim()
    .min(1, 'Informe o código.')
    .max(40)
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(code, 'Use letras, números, ponto, hífen, barra ou sublinhado.')),
  description: z.string().trim().max(1000),
});

export type WarehouseFormValues = z.input<typeof warehouseSchema>;

export const warehouseToForm = (warehouse?: Warehouse): WarehouseFormValues => ({
  name: warehouse?.name ?? '',
  code: warehouse?.code ?? '',
  description: warehouse?.description ?? '',
});

export const toWarehouseInput = (values: WarehouseFormValues, editing = false): WarehouseInput => {
  const parsed = warehouseSchema.parse(values);
  const description = parsed.description || undefined;
  return {
    name: parsed.name,
    code: parsed.code,
    ...(description ? { description } : editing ? { description: null } : {}),
  };
};
