import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { PurchaseOrderFormPage } from '../../../../../features/purchase-orders/components/purchase-order-form-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';
export default function NewPurchaseOrderRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.PURCHASE_ORDERS_CREATE}>
      <PurchaseOrderFormPage />
    </PermissionGate>
  );
}
