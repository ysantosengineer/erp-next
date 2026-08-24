import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { CustomersController } from './customers.controller';

describe('CustomersController permissions', () => {
  const permission = (method: keyof CustomersController) =>
    Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CustomersController.prototype[method]);

  it('protege consultas', () => {
    expect(permission('findAll')).toEqual([PERMISSIONS.CUSTOMERS_READ]);
    expect(permission('findOne')).toEqual([PERMISSIONS.CUSTOMERS_READ]);
  });

  it('protege mutações', () => {
    expect(permission('create')).toEqual([PERMISSIONS.CUSTOMERS_CREATE]);
    expect(permission('update')).toEqual([PERMISSIONS.CUSTOMERS_UPDATE]);
    expect(permission('updateStatus')).toEqual([PERMISSIONS.CUSTOMERS_MANAGE_STATUS]);
  });
});
