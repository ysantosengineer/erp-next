import { ReportPage } from '../../../../features/analytics/components/report-page';
import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';
export default function FinanceReportRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.FINANCE_READ}>
      <ReportPage kind="finance" />
    </PermissionGate>
  );
}
