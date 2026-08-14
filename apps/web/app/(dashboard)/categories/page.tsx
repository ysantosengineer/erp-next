import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { CatalogPage } from '../../../features/catalog/components/catalog-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
export default function CategoriesRoute() { return <PermissionGate permission={PERMISSIONS.CATEGORIES_READ}><CatalogPage resource="categories" title="Categorias" permissions={{ create: PERMISSIONS.CATEGORIES_CREATE, update: PERMISSIONS.CATEGORIES_UPDATE, status: PERMISSIONS.CATEGORIES_MANAGE_STATUS }}/></PermissionGate>; }
