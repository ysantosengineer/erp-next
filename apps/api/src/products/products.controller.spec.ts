import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { ProductsController } from './products.controller';

describe('ProductsController permissions', () => {
  const permission = (method: keyof ProductsController) =>
    Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ProductsController.prototype[method]);

  it('protege as consultas com products.read', () => {
    expect(permission('findAll')).toEqual([PERMISSIONS.PRODUCTS_READ]);
    expect(permission('findOne')).toEqual([PERMISSIONS.PRODUCTS_READ]);
  });

  it('protege criação, edição e status com permissões específicas', () => {
    expect(permission('create')).toEqual([PERMISSIONS.PRODUCTS_CREATE]);
    expect(permission('update')).toEqual([PERMISSIONS.PRODUCTS_UPDATE]);
    expect(permission('updateStatus')).toEqual([PERMISSIONS.PRODUCTS_MANAGE_STATUS]);
  });
});
