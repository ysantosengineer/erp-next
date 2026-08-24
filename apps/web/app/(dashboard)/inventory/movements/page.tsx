import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { InventoryMovementsPage } from '../../../../features/inventory/components/inventory-movements-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function InventoryMovementsRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.INVENTORY_MOVEMENTS_READ}>
      <InventoryMovementsPage />
    </PermissionGate>
  );
}
