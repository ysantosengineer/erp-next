import { PermissionGate } from '../../../../../features/auth/components/permission-gate';
import { ProductFormPage } from '../../../../../features/products/components/product-form-page';
import { PERMISSIONS } from '../../../../../lib/permissions/permissions';

export default async function EditProductRoute({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMISSIONS.PRODUCTS_UPDATE}>
      <ProductFormPage productId={id} />
    </PermissionGate>
  );
}
