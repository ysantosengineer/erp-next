import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

describe('AuthController cookie origin validation', () => {
  const authService = {
    refresh: jest.fn(),
    logout: jest.fn(),
  } as unknown as AuthService;
  const response = {} as Response;

  afterEach(() => jest.clearAllMocks());

  it('rejeita refresh sem origem confiável quando SameSite=None', () => {
    const controller = new AuthController(authService, config('none'));

    expect(() => controller.refresh(request('https://malicious.example'), response)).toThrow(
      ForbiddenException,
    );
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('aceita a origem explícita do frontend quando SameSite=None', () => {
    const refresh = authService.refresh as jest.Mock;
    refresh.mockReturnValue(new Promise(() => undefined));
    const controller = new AuthController(authService, config('none'));

    void controller.refresh(request('https://app.example.com'), response);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('mantém compatibilidade local com SameSite=Lax', () => {
    const refresh = authService.refresh as jest.Mock;
    refresh.mockReturnValue(new Promise(() => undefined));
    const controller = new AuthController(authService, config('lax'));

    void controller.refresh(request(), response);

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

function config(sameSite: 'lax' | 'none'): ConfigService {
  return {
    get: jest.fn((key: string) => (key === 'AUTH_COOKIE_SAME_SITE' ? sameSite : undefined)),
    getOrThrow: jest.fn(() => 'https://app.example.com'),
  } as unknown as ConfigService;
}

function request(origin?: string): Request {
  return {
    headers: origin ? { origin } : {},
    cookies: { erp_next_refresh_token: 'test-token' },
  } as unknown as Request;
}
