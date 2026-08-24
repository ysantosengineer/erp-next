import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { WarehousesPage } from '../../../features/warehouses/components/warehouses-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';

export default function WarehousesRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.WAREHOUSES_READ}>
      <WarehousesPage />
    </PermissionGate>
  );
}
