import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { PurchaseReceiptsPage } from '../../../../features/purchase-receipts/components/purchase-receipts-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function PurchaseReceiptsRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.PURCHASE_RECEIPTS_READ}>
      <PurchaseReceiptsPage />
    </PermissionGate>
  );
}
