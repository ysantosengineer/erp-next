import { ReportPage } from '../../../../features/analytics/components/report-page';
import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';
export default function InventoryReportRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.INVENTORY_READ}>
      <ReportPage kind="inventory" />
    </PermissionGate>
  );
}
