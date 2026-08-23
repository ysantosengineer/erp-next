import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { InventoryCountsController } from './inventory-counts.controller';

describe('InventoryCountsController permissions', () => {
  const permission = (method: keyof InventoryCountsController) =>
    Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryCountsController.prototype[method]);

  it.each([
    ['findAll', PERMISSIONS.INVENTORY_COUNTS_READ],
    ['findOne', PERMISSIONS.INVENTORY_COUNTS_READ],
    ['create', PERMISSIONS.INVENTORY_COUNTS_CREATE],
    ['start', PERMISSIONS.INVENTORY_COUNTS_CREATE],
    ['options', PERMISSIONS.INVENTORY_COUNTS_COUNT],
    ['addItem', PERMISSIONS.INVENTORY_COUNTS_COUNT],
    ['countItem', PERMISSIONS.INVENTORY_COUNTS_COUNT],
    ['requestRecount', PERMISSIONS.INVENTORY_COUNTS_RECOUNT],
    ['recountItem', PERMISSIONS.INVENTORY_COUNTS_RECOUNT],
    ['approve', PERMISSIONS.INVENTORY_COUNTS_APPROVE],
    ['cancel', PERMISSIONS.INVENTORY_COUNTS_CANCEL],
  ] as const)('%s exige %s', (method, expected) => {
    expect(permission(method)).toEqual([expected]);
  });
});
