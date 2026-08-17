import { z } from 'zod';
import { formatDecimalPtBr, normalizeDecimal } from '../../../lib/decimal';
import type { StockLocation, StockLocationInput } from '../types/stock-location.types';

const codePattern = /^[A-Z0-9][A-Z0-9._/-]*$/;
const capacityPattern = /^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/;
const optional = (max: number) => z.string().trim().max(max);

export const stockLocationSchema = z
  .object({
    code: z.string().trim().min(1, 'Informe o código.').max(80),
    description: optional(1000),
    zone: optional(40),
    aisle: optional(40),
    rack: optional(40),
    level: optional(40),
    position: optional(40),
    capacity: z.string().trim(),
  })
  .superRefine((values, context) => {
    if (!codePattern.test(values.code.toUpperCase())) {
      context.addIssue({ code: 'custom', path: ['code'], message: 'Informe um código válido.' });
    }
    if (values.capacity && !capacityPattern.test(normalizeDecimal(values.capacity))) {
      context.addIssue({
        code: 'custom',
        path: ['capacity'],
        message: 'Informe uma capacidade não negativa, com até 3 casas decimais.',
      });
    }
  });

export type StockLocationFormValues = z.infer<typeof stockLocationSchema>;

export const stockLocationToForm = (location?: StockLocation): StockLocationFormValues => ({
  code: location?.code ?? '',
  description: location?.description ?? '',
  zone: location?.zone ?? '',
  aisle: location?.aisle ?? '',
  rack: location?.rack ?? '',
  level: location?.level ?? '',
  position: location?.position ?? '',
  capacity: location?.capacity ? formatDecimalPtBr(location.capacity, 3) : '',
});

export const toStockLocationInput = (
  values: StockLocationFormValues,
  editing = false,
): StockLocationInput => {
  const optionalValue = (value: string, upper = false) => {
    const trimmed = value.trim();
    return trimmed ? (upper ? trimmed.toUpperCase() : trimmed) : undefined;
  };
  const optionalFields = {
    description: optionalValue(values.description),
    zone: optionalValue(values.zone, true),
    aisle: optionalValue(values.aisle, true),
    rack: optionalValue(values.rack, true),
    level: optionalValue(values.level, true),
    position: optionalValue(values.position, true),
    capacity: values.capacity ? normalizeDecimal(values.capacity) : undefined,
  };
  const input: StockLocationInput = { code: values.code.trim().toUpperCase() };
  for (const [key, value] of Object.entries(optionalFields) as [
    keyof Omit<StockLocationInput, 'code'>,
    string | undefined,
  ][]) {
    if (value) input[key] = value;
    else if (editing) input[key] = null;
  }
  return input;
};
