import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { RolesPage } from '../../../features/roles/components/roles-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';

export default function RolesRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.ROLES_READ}>
      <RolesPage />
    </PermissionGate>
  );
}
