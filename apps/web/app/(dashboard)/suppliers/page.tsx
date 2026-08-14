import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { SuppliersPage } from '../../../features/suppliers/components/suppliers-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
export default function SuppliersRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.SUPPLIERS_READ}>
      <SuppliersPage />
    </PermissionGate>
  );
}
