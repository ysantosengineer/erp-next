import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { InventoryController } from './inventory.controller';

describe('InventoryController permissions', () => {
  const permission = (method: keyof InventoryController) =>
    Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype[method]);

  it.each([
    ['findBalances', PERMISSIONS.INVENTORY_READ],
    ['options', PERMISSIONS.INVENTORY_READ],
    ['findProductBalance', PERMISSIONS.INVENTORY_READ],
    ['findBalance', PERMISSIONS.INVENTORY_READ],
    ['findMovements', PERMISSIONS.INVENTORY_MOVEMENTS_READ],
    ['findMovement', PERMISSIONS.INVENTORY_MOVEMENTS_READ],
    ['entry', PERMISSIONS.INVENTORY_ENTRY],
    ['exit', PERMISSIONS.INVENTORY_EXIT],
    ['adjustment', PERMISSIONS.INVENTORY_ADJUST],
    ['transfer', PERMISSIONS.INVENTORY_TRANSFER],
  ] as const)('%s exige %s', (method, expected) => {
    expect(permission(method)).toEqual([expected]);
  });
});
