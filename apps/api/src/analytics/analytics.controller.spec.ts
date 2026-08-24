import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController permissions', () => {
  it.each([
    ['dashboard', 'analytics.dashboard.read'],
    ['sales', 'sales_orders.read'],
    ['purchases', 'purchase_orders.read'],
    ['inventory', 'inventory.read'],
    ['finance', 'finance.read'],
  ] as const)('%s exige %s', (method, permission) => {
    const prototype = AnalyticsController.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, prototype[method])).toEqual([permission]);
  });
});
