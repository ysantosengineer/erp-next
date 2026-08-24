import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { WarehousesController } from './warehouses.controller';

describe('WarehousesController permissions', () => {
  const permission = (method: keyof WarehousesController) =>
    Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehousesController.prototype[method]);

  it('protege consultas', () => {
    expect(permission('findAll')).toEqual([PERMISSIONS.WAREHOUSES_READ]);
    expect(permission('findOne')).toEqual([PERMISSIONS.WAREHOUSES_READ]);
  });

  it('protege mutações', () => {
    expect(permission('create')).toEqual([PERMISSIONS.WAREHOUSES_CREATE]);
    expect(permission('update')).toEqual([PERMISSIONS.WAREHOUSES_UPDATE]);
    expect(permission('updateStatus')).toEqual([PERMISSIONS.WAREHOUSES_MANAGE_STATUS]);
  });
});
