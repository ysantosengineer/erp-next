import type {
  AuthTokens,
  AuthenticatedUser,
  LoginCredentials,
} from '../../features/auth/types/auth.types';
import { ApiError, type ApiErrorPayload } from './api-error';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type RequestOptions = RequestInit & { retryAfterRefresh?: boolean; notifyUnauthorized?: boolean };

type SessionInvalidatedHandler = () => void;

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;
  private sessionInvalidatedHandler: SessionInvalidatedHandler | null = null;

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const tokens = await this.request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      retryAfterRefresh: false,
      notifyUnauthorized: false,
    });
    this.accessToken = tokens.accessToken;
    return tokens;
  }

  async refreshSession(): Promise<AuthTokens> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.request<AuthTokens>('/auth/refresh', {
        method: 'POST',
        retryAfterRefresh: false,
        notifyUnauthorized: false,
      }).finally(() => {
        this.refreshPromise = null;
      });
    }

    const tokens = await this.refreshPromise;
    this.accessToken = tokens.accessToken;
    return tokens;
  }

  async getCurrentUser(): Promise<AuthenticatedUser> {
    return this.request<AuthenticatedUser>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/auth/logout', {
        method: 'POST',
        retryAfterRefresh: false,
        notifyUnauthorized: false,
      });
    } finally {
      this.accessToken = null;
      this.refreshPromise = null;
    }
  }

  clearSession(): void {
    this.accessToken = null;
    this.refreshPromise = null;
  }

  setSessionInvalidatedHandler(handler: SessionInvalidatedHandler | null): void {
    this.sessionInvalidatedHandler = handler;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
    return this.request<TResponse>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
    return this.request<TResponse>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  put<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
    return this.request<TResponse>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete(path: string): Promise<void> {
    return this.request<void>(path, { method: 'DELETE' });
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { retryAfterRefresh = true, notifyUnauthorized = true, headers, ...init } = options;
    const response = await this.fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
        'x-request-id': crypto.randomUUID(),
        ...headers,
      },
    });

    if (response.status === 401 && retryAfterRefresh) {
      try {
        await this.refreshSession();
        return this.request<T>(path, { ...options, retryAfterRefresh: false });
      } catch {
        this.clearSession();
        if (notifyUnauthorized) this.sessionInvalidatedHandler?.();
      }
    }

    if (!response.ok) throw await this.toApiError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private fetch(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${apiUrl}${path}`, { ...init, credentials: 'include' }).catch(() => {
      throw new ApiError(0, {
        code: 'API_UNAVAILABLE',
        message: 'Não foi possível conectar à API. Tente novamente em instantes.',
      });
    });
  }

  private async toApiError(response: Response): Promise<ApiError> {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // A API pode estar indisponível ou responder sem JSON.
    }
    return new ApiError(response.status, payload);
  }
}

export const apiClient = new ApiClient();
