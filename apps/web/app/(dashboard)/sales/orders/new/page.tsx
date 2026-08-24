import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { SalesOrderFormPage } from '../../../../../features/sales-orders/components/sales-order-form-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';

export default function NewSalesOrderRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.SALES_ORDERS_CREATE}>
      <SalesOrderFormPage />
    </PermissionGate>
  );
}
