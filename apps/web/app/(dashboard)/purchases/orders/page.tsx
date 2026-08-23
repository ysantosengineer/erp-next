import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { PurchaseOrdersPage } from '../../../../features/purchase-orders/components/purchase-orders-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';
export default function PurchaseOrdersRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.PURCHASE_ORDERS_READ}>
      <PurchaseOrdersPage />
    </PermissionGate>
  );
}
