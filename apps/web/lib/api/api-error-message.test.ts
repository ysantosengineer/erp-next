import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { getApiErrorMessage } from './api-error-message';

describe('getApiErrorMessage inventory rules', () => {
  it('explica bloqueio de depósito com endereços ativos', () => {
    const error = new ApiError(422, { code: 'WAREHOUSE_HAS_ACTIVE_LOCATIONS' });
    expect(getApiErrorMessage(error, 'fallback')).toMatch(/inative todos os endereços/i);
  });

  it('explica que o depósito deve estar ativo', () => {
    const error = new ApiError(422, { code: 'WAREHOUSE_INACTIVE' });
    expect(getApiErrorMessage(error, 'fallback')).toMatch(/ative o depósito/i);
  });
});
