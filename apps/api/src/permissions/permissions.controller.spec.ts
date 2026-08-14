import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { PermissionsController } from './permissions.controller';

describe('PermissionsController', () => {
  it('protege o catálogo com roles.manage_permissions', () => {
    const required = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      PermissionsController.prototype.findAll,
    ) as string[] | undefined;

    expect(required).toEqual([PERMISSIONS.ROLES_MANAGE_PERMISSIONS]);
  });
});
