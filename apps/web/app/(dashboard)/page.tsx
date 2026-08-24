import { DashboardPage as AnalyticsDashboardPage } from '../../features/analytics/components/dashboard-page';
import { PermissionGate } from '../../features/auth/components/permission-gate';
import { PERMISSIONS } from '../../lib/permissions/permissions';

export default function DashboardPage() {
  return (
    <PermissionGate permission={PERMISSIONS.ANALYTICS_DASHBOARD_READ}>
      <AnalyticsDashboardPage />
    </PermissionGate>
  );
}
