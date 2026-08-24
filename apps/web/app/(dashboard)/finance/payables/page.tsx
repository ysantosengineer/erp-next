import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { FinancialEntriesPage } from '../../../../features/finance/components/financial-entries-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function PayablesRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.FINANCE_READ}>
      <FinancialEntriesPage type="PAYABLE" />
    </PermissionGate>
  );
}
