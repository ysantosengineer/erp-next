import { ReportPage } from '../../../../features/analytics/components/report-page';
import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';
export default function SalesReportRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.SALES_ORDERS_READ}>
      <ReportPage kind="sales" />
    </PermissionGate>
  );
}
