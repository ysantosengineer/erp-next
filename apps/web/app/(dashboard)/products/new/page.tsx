import { PermissionGate } from '../../../../features/auth/components/permission-gate';
import { ProductFormPage } from '../../../../features/products/components/product-form-page';
import { PERMISSIONS } from '../../../../lib/permissions/permissions';

export default function NewProductRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.PRODUCTS_CREATE}>
      <ProductFormPage />
    </PermissionGate>
  );
}
