import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { InventoryCountsPage } from '../../../../features/inventory-counts/components/inventory-counts-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function InventoryCountsRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.INVENTORY_COUNTS_READ}>
      <InventoryCountsPage />
    </PermissionGate>
  );
}
