import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { SalesOrdersController } from './sales-orders.controller';

describe('SalesOrdersController permissions', () => {
  it.each([
    ['findAll', 'sales_orders.read'],
    ['options', 'sales_orders.read'],
    ['findOne', 'sales_orders.read'],
    ['create', 'sales_orders.create'],
    ['update', 'sales_orders.update'],
    ['confirm', 'sales_orders.confirm'],
    ['cancel', 'sales_orders.cancel'],
    ['reserve', 'inventory.reserve'],
    ['releaseReservation', 'inventory.release'],
    ['ship', 'inventory.ship'],
  ] as const)('%s exige %s', (method, permission) => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesOrdersController.prototype[method]),
    ).toEqual([permission]);
  });
});
