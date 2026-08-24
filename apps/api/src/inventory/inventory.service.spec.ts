import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventoryService } from './inventory.service';

const identity: AuthenticatedUser = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  companyId: '550e8400-e29b-41d4-a716-446655440001',
  companyName: 'Empresa',
  name: 'Usuário',
  email: 'user@example.com',
  authVersion: 1,
  roles: [],
  permissions: [],
};

describe('InventoryService', () => {
  it('bloqueia transferência para o mesmo endereço antes de abrir transação', async () => {
    const service = new InventoryService({} as never);
    expect(() =>
      service.transfer(
        identity,
        {
          productId: '550e8400-e29b-41d4-a716-446655440002',
          sourceLocationId: '550e8400-e29b-41d4-a716-446655440003',
          destinationLocationId: '550e8400-e29b-41d4-a716-446655440003',
          quantity: '1',
        },
        'request',
      ),
    ).toThrow(BadRequestException);
  });

  it('consulta saldo sempre com companyId e não expõe outro tenant', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new InventoryService({ inventoryBalance: { findFirst } } as never);
    await expect(
      service.findBalance(identity, '550e8400-e29b-41d4-a716-446655440004'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '550e8400-e29b-41d4-a716-446655440004', companyId: identity.companyId },
      }),
    );
  });
});
