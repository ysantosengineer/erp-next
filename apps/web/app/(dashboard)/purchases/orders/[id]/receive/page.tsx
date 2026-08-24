import { PermissionGate } from '../../../../../../features/auth/components/permission-gate';
import { PurchaseReceiptFormPage } from '../../../../../../features/purchase-receipts/components/purchase-receipt-form-page';
import { PERMISSIONS } from '../../../../../../lib/permissions/permissions';

export default async function PurchaseOrderReceiveRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.PURCHASE_RECEIPTS_CREATE}>
      <PurchaseReceiptFormPage orderId={id} />
    </PermissionGate>
  );
}
