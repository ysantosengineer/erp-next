import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { PurchaseOrderDetailPage } from '../../../../../features/purchase-orders/components/purchase-order-detail-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';
export default async function PurchaseOrderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.PURCHASE_ORDERS_READ}>
      <PurchaseOrderDetailPage orderId={id} />
    </PermissionGate>
  );
}
