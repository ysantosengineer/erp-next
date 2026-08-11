import { PermissionGate } from '../../../features/auth/components/permission-gate';
import { CatalogPage } from '../../../features/catalog/components/catalog-page';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
export default function UnitsRoute() { return <PermissionGate permission={PERMISSIONS.UNITS_READ}><CatalogPage resource="units" title="Unidades de medida" hasSymbol permissions={{ create: PERMISSIONS.UNITS_CREATE, update: PERMISSIONS.UNITS_UPDATE, status: PERMISSIONS.UNITS_MANAGE_STATUS }}/></PermissionGate>; }
