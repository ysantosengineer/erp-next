import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { ProductsPage } from '../../../features/products/components/products-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';

export default function ProductsRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.PRODUCTS_READ}>
      <ProductsPage />
    </PermissionGate>
  );
}
