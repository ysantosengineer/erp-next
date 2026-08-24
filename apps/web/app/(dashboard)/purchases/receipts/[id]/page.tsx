import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { PurchaseReceiptDetailPage } from '../../../../../features/purchase-receipts/components/purchase-receipt-detail-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';

export default async function PurchaseReceiptRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.PURCHASE_RECEIPTS_READ}>
      <PurchaseReceiptDetailPage receiptId={id} />
    </PermissionGate>
  );
}
