import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';

export const REFRESH_TOKEN_COOKIE = 'erp_next_refresh_token';

export function getRefreshTokenCookieOptions(configService: ConfigService): CookieOptions {
  const refreshTtlSeconds = configService.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS');
  const secure = configService.get<string>('AUTH_COOKIE_SECURE') === 'true';

  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: refreshTtlSeconds * 1000,
  };
}

export function getClearRefreshTokenCookieOptions(configService: ConfigService): CookieOptions {
  const options = getRefreshTokenCookieOptions(configService);
  return {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  };
}
