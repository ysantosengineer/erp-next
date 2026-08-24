import { digitsOnly, isValidCnpj, isValidCpf } from './br-document.util';

describe('Brazilian document helpers', () => {
  it('remove máscara e caracteres não numéricos', () => {
    expect(digitsOnly('529.982.247-25')).toBe('52998224725');
  });

  it.each(['52998224725', '11144477735'])('aceita CPF válido %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each(['11111111111', '52998224724', '123'])('rejeita CPF inválido %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });

  it.each(['04252011000110', '11444777000161'])('aceita CNPJ válido %s', (cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(true);
  });

  it.each(['11111111111111', '04252011000111', '123'])('rejeita CNPJ inválido %s', (cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(false);
  });
});
