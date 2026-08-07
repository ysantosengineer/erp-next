import { describe, expect, it } from '@jest/globals';
import { getRefreshTokenCookieOptions, REFRESH_TOKEN_COOKIE } from './auth-cookie';

describe('refresh token cookie', () => {
  it('usa cookie HttpOnly com escopo restrito ao auth', () => {
    const configService = {
      getOrThrow: jest.fn(() => 604800),
      get: jest.fn(() => 'false'),
    };

    expect(REFRESH_TOKEN_COOKIE).toBe('erp_next_refresh_token');
    expect(getRefreshTokenCookieOptions(configService as never)).toEqual(
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 604800000,
      }),
    );
  });
});
