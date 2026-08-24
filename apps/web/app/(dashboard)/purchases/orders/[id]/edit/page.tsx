import { PermissionGate } from '../../../../../../features/auth/components/permission-gate';
import { PurchaseOrderFormPage } from '../../../../../../features/purchase-orders/components/purchase-order-form-page';
import { PERMISSIONS } from '../../../../../../lib/permissions/permissions';
export default async function EditPurchaseOrderRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.PURCHASE_ORDERS_UPDATE}>
      <PurchaseOrderFormPage orderId={id} />
    </PermissionGate>
  );
}
