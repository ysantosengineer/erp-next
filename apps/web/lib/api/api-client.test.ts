import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('apiClient', () => {
  beforeEach(() => {
    apiClient.clearSession();
    vi.unstubAllGlobals();
  });

  it('renova a sessão uma única vez e repete a requisição protegida', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: 'access-1', tokenType: 'Bearer', expiresIn: 900 }),
      )
      .mockResolvedValueOnce(jsonResponse({ statusCode: 401, code: 'INVALID_SESSION' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: 'access-2', tokenType: 'Bearer', expiresIn: 900 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'user-1',
          name: 'Admin',
          email: 'admin@erp.local',
          company: { id: 'company-1', name: 'Empresa' },
          roles: ['Administrator'],
          permissions: ['users.read'],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.login({ email: 'admin@erp.local', password: 'senha-segura-com-12-caracteres' });
    const user = await apiClient.getCurrentUser();

    expect(user.name).toBe('Admin');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[2][0]).toContain('/auth/refresh');
  });

  it('sempre envia cookies para a API e não grava tokens no navegador', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ accessToken: 'access', tokenType: 'Bearer', expiresIn: 900 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.login({ email: 'admin@erp.local', password: 'senha-segura-com-12-caracteres' });

    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ credentials: 'include' }));
    expect(localStorage.length).toBe(0);
  });

  it('expõe operações tipadas para serviços de domínio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.get('/users?page=1');

    expect(fetchMock.mock.calls[0][0]).toContain('/users?page=1');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ credentials: 'include' }));
  });

  it('notifica a aplicação quando a sessão protegida não pode ser renovada', async () => {
    const invalidated = vi.fn();
    apiClient.setSessionInvalidatedHandler(invalidated);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ statusCode: 401, code: 'INVALID_SESSION' }, 401))
      .mockResolvedValueOnce(jsonResponse({ statusCode: 401, code: 'INVALID_SESSION' }, 401));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.get('/users')).rejects.toBeDefined();

    expect(invalidated).toHaveBeenCalledTimes(1);
    apiClient.setSessionInvalidatedHandler(null);
  });
});
