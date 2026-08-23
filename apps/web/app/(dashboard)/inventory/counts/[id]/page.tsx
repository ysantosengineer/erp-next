import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { InventoryCountDetailPage } from '../../../../../features/inventory-counts/components/inventory-count-detail-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';

export default async function InventoryCountDetailRoute({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.INVENTORY_COUNTS_READ}>
      <InventoryCountDetailPage id={id} />
    </PermissionGate>
  );
}
