import { CustomerType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCustomerDto, ListCustomersQueryDto } from './customer.dto';

describe('Customer DTOs', () => {
  const valid = {
    type: CustomerType.INDIVIDUAL,
    name: 'Maria da Silva',
    document: '529.982.247-25',
  };

  it('aceita cliente PF mínimo', async () => {
    expect(await validate(plainToInstance(CreateCustomerDto, valid))).toHaveLength(0);
  });

  it('aceita limite com duas casas sem converter para number', async () => {
    const dto = plainToInstance(CreateCustomerDto, { ...valid, creditLimit: '999999999999.99' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.creditLimit).toBe('999999999999.99');
  });

  it.each(['-1.00', '1.001', '01.00', '1000000000000.00'])(
    'rejeita limite inválido %s',
    async (creditLimit) => {
      expect(
        await validate(plainToInstance(CreateCustomerDto, { ...valid, creditLimit })),
      ).not.toHaveLength(0);
    },
  );

  it('normaliza email e UF', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      ...valid,
      email: ' MARIA@EXAMPLE.COM ',
      address: { state: ' pr ', postalCode: '80010-000' },
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('maria@example.com');
    expect(dto.address?.state).toBe('PR');
  });

  it('converte paginação e mantém ordenação em whitelist', async () => {
    const dto = plainToInstance(ListCustomersQueryDto, {
      page: '2',
      limit: '10',
      sortBy: 'creditLimit',
      sortOrder: 'desc',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('rejeita campo de ordenação fora da whitelist', async () => {
    const dto = plainToInstance(ListCustomersQueryDto, { sortBy: 'companyId' });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
