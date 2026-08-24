import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { SalesOrdersPage } from '../../../../features/sales-orders/components/sales-orders-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function SalesOrdersRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.SALES_ORDERS_READ}>
      <SalesOrdersPage />
    </PermissionGate>
  );
}
