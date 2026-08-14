import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { UsersPage } from '../../../features/users/components/users-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';

export default function UsersRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.USERS_READ}>
      <UsersPage />
    </PermissionGate>
  );
}
