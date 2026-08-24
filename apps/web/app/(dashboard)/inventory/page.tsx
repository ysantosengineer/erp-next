import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { InventoryPage } from '../../../features/inventory/components/inventory-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';

export default function InventoryRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.INVENTORY_READ}>
      <InventoryPage />
    </PermissionGate>
  );
}
