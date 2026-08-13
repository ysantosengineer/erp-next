import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { SuppliersController } from './suppliers.controller';
describe('SuppliersController permissions', () => {
  const permission = (method: keyof SuppliersController) =>
    Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SuppliersController.prototype[method]);
  it('protege consultas', () => {
    expect(permission('findAll')).toEqual([PERMISSIONS.SUPPLIERS_READ]);
    expect(permission('findOne')).toEqual([PERMISSIONS.SUPPLIERS_READ]);
  });
  it('protege mutações', () => {
    expect(permission('create')).toEqual([PERMISSIONS.SUPPLIERS_CREATE]);
    expect(permission('update')).toEqual([PERMISSIONS.SUPPLIERS_UPDATE]);
    expect(permission('updateStatus')).toEqual([PERMISSIONS.SUPPLIERS_MANAGE_STATUS]);
  });
});
