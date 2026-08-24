import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { StockReservationsPage } from '../../../../features/inventory/components/stock-reservations-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function StockReservationsRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.INVENTORY_RESERVATIONS_READ}>
      <StockReservationsPage />
    </PermissionGate>
  );
}
