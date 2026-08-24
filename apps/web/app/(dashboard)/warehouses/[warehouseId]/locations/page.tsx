import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { StockLocationsPage } from '../../../../../features/stock-locations/components/stock-locations-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';

export default async function StockLocationsRoute({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.STOCK_LOCATIONS_READ}>
      <StockLocationsPage warehouseId={warehouseId} />
    </PermissionGate>
  );
}
