import { PermissionGate } from '../../../../../../features/auth/components/permission-gate';
import { SalesOrderFormPage } from '../../../../../../features/sales-orders/components/sales-order-form-page';
import { PERMISSIONS } from '../../../../../../lib/permissions/permissions';

export default async function EditSalesOrderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.SALES_ORDERS_UPDATE}>
      <SalesOrderFormPage orderId={id} />
    </PermissionGate>
  );
}
