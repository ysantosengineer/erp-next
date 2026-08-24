import { ReportPage } from '../../../../features/analytics/components/report-page';
import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';
export default function PurchasesReportRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.PURCHASE_ORDERS_READ}>
      <ReportPage kind="purchases" />
    </PermissionGate>
  );
}
