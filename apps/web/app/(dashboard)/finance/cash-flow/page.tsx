import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { CashFlowPage } from '../../../../features/finance/components/cash-flow-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function CashFlowRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.FINANCE_CASH_FLOW_READ}>
      <CashFlowPage />
    </PermissionGate>
  );
}
