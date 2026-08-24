import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { PurchaseOrdersController } from './purchase-orders.controller';
describe('PurchaseOrdersController permissions', () => {
  it.each([
    ['findAll', 'purchase_orders.read'],
    ['create', 'purchase_orders.create'],
    ['update', 'purchase_orders.update'],
    ['submit', 'purchase_orders.submit'],
    ['approve', 'purchase_orders.approve'],
    ['cancel', 'purchase_orders.cancel'],
  ] as const)('%s exige %s', (method, permission) => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseOrdersController.prototype[method]),
    ).toEqual([permission]);
  });
});
