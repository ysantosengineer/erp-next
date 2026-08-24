import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { FinancialEntryDetailPage } from '../../../../../features/finance/components/financial-entry-detail-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';

export default async function FinancialEntryRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.FINANCE_READ}>
      <FinancialEntryDetailPage id={id} />
    </PermissionGate>
  );
}
