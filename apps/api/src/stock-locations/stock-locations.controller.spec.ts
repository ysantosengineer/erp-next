import { PERMISSIONS } from '../authorization/permissions.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { StockLocationsController } from './stock-locations.controller';

describe('StockLocationsController', () => {
  it.each([
    ['findAll', PERMISSIONS.STOCK_LOCATIONS_READ],
    ['findOne', PERMISSIONS.STOCK_LOCATIONS_READ],
    ['create', PERMISSIONS.STOCK_LOCATIONS_CREATE],
    ['update', PERMISSIONS.STOCK_LOCATIONS_UPDATE],
    ['updateStatus', PERMISSIONS.STOCK_LOCATIONS_MANAGE_STATUS],
  ] as const)('protege %s com %s', (method, permission) => {
    const handler = StockLocationsController.prototype[method];
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler)).toEqual([permission]);
  });
});
