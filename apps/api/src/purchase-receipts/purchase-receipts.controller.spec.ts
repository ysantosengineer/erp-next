import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import {
  PurchaseOrderReceivableController,
  PurchaseReceiptsController,
} from './purchase-receipts.controller';

describe('PurchaseReceiptsController permissions', () => {
  it.each([
    [PurchaseReceiptsController, 'findAll', 'purchase_receipts.read'],
    [PurchaseReceiptsController, 'options', 'purchase_receipts.read'],
    [PurchaseReceiptsController, 'findOne', 'purchase_receipts.read'],
    [PurchaseReceiptsController, 'create', 'purchase_receipts.create'],
    [PurchaseOrderReceivableController, 'receivable', 'purchase_receipts.create'],
  ] as const)('%s.%s exige %s', (controller, method, permission) => {
    const prototype = controller.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, prototype[method])).toEqual([permission]);
  });
});
