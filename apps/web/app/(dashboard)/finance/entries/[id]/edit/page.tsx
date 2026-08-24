import { PermissionGate } from '../../../../../../features/auth/components/permission-gate';
import { FinancialEntryFormPage } from '../../../../../../features/finance/components/financial-entry-form-page';
import { PERMISSIONS } from '../../../../../../lib/permissions/permissions';

export default async function EditFinancialEntryRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.FINANCE_UPDATE}>
      <FinancialEntryFormPage entryId={id} />
    </PermissionGate>
  );
}
