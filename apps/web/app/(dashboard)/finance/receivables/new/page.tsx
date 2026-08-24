import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { FinancialEntryFormPage } from '../../../../../features/finance/components/financial-entry-form-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';

export default function NewReceivableRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.FINANCE_CREATE}>
      <FinancialEntryFormPage type="RECEIVABLE" />
    </PermissionGate>
  );
}
