import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { FinancialEntriesPage } from '../../../../features/finance/components/financial-entries-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function ReceivablesRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.FINANCE_READ}>
      <FinancialEntriesPage type="RECEIVABLE" />
    </PermissionGate>
  );
}
