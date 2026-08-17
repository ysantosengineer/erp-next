export function normalizeDecimal(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes(',')) return trimmed.replace(/\./g, '').replace(',', '.');
  if (/^\d{1,3}(?:\.\d{3})+$/.test(trimmed)) return trimmed.replace(/\./g, '');
  return trimmed;
}

export function formatDecimalPtBr(value: string, scale: number): string {
  const [integer = '0', fraction = ''] = value.split('.');
  const grouped = integer.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${grouped || '0'},${fraction.padEnd(scale, '0').slice(0, scale)}`;
}

export const formatCurrency = (value: string) => `R$ ${formatDecimalPtBr(value, 2)}`;
