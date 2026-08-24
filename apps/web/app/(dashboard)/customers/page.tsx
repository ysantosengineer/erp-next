import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { CustomersPage } from '../../../features/customers/components/customers-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';

export default function CustomersRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.CUSTOMERS_READ}>
      <CustomersPage />
    </PermissionGate>
  );
}
