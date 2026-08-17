export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

const hasRepeatedDigits = (value: string): boolean => /^(\d)\1+$/.test(value);

export function isValidCpf(value: string): boolean {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false;

  for (let digit = 9; digit < 11; digit += 1) {
    let sum = 0;
    for (let index = 0; index < digit; index += 1) {
      sum += Number(cpf[index]) * (digit + 1 - index);
    }
    if (((sum * 10) % 11) % 10 !== Number(cpf[digit])) return false;
  }
  return true;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = digitsOnly(value);
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false;

  const calculate = (length: number): number => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const remainder =
      weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculate(12) === Number(cnpj[12]) && calculate(13) === Number(cnpj[13]);
}
