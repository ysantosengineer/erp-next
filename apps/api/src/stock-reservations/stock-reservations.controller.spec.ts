import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { StockReservationsController } from './stock-reservations.controller';

describe('StockReservationsController permissions', () => {
  it.each(['findAll', 'findOne'] as const)('%s exige leitura de reservas', (method) => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, StockReservationsController.prototype[method]),
    ).toEqual([PERMISSIONS.INVENTORY_RESERVATIONS_READ]);
  });
});
