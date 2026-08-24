import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { SalesOrderDetailPage } from '../../../../../features/sales-orders/components/sales-order-detail-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';

export default async function SalesOrderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.SALES_ORDERS_READ}>
      <SalesOrderDetailPage orderId={id} />
    </PermissionGate>
  );
}
