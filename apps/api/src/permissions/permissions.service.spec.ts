import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  const prisma = { permission: { findMany: jest.fn() } };
  const service = new PermissionsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('retorna o catálogo global em formato seguro e ordenado', async () => {
    prisma.permission.findMany.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000001',
        resource: 'roles',
        action: 'read',
        description: 'Consulta papéis.',
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({ code: 'roles.read', resource: 'roles', action: 'read' }),
    ]);
    expect(prisma.permission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] }),
    );
  });
});
