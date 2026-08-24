import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import type { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;

  afterEach(() => jest.clearAllMocks());

  it('expõe liveness com versão sem consultar dependências', () => {
    const config = {
      get: jest.fn((key: string) => (key === 'APP_VERSION' ? 'abc123' : undefined)),
    };
    const controller = new AppController(prisma, config as unknown as ConfigService);

    expect(controller.health()).toEqual({ status: 'ok', version: 'abc123' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('consulta o banco na readiness e usa o commit do Render como versão', async () => {
    const config = {
      get: jest.fn((key: string) => (key === 'RENDER_GIT_COMMIT' ? '0123456789abcdef' : undefined)),
    };
    const controller = new AppController(prisma, config as unknown as ConfigService);

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
      version: '0123456789ab',
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});
