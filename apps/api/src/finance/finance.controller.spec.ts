import { REQUIRED_PERMISSIONS_KEY } from '../authorization/require-permissions.decorator';
import { FinanceController } from './finance.controller';

describe('FinanceController permissions', () => {
  it.each([
    ['findAll', 'finance.read'],
    ['options', 'finance.read'],
    ['findOne', 'finance.read'],
    ['create', 'finance.create'],
    ['update', 'finance.update'],
    ['settle', 'finance.settle'],
    ['cancel', 'finance.cancel'],
    ['cashFlow', 'finance.cash_flow.read'],
    ['summary', 'finance.read'],
  ] as const)('%s exige %s', (method, permission) => {
    const prototype = FinanceController.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, prototype[method])).toEqual([permission]);
  });
});
