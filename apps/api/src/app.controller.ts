import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';

interface HealthResponse {
  status: 'ok';
  version: string;
}

interface ReadinessResponse extends HealthResponse {
  database: 'ok';
}

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  health(): HealthResponse {
    return { status: 'ok', version: this.applicationVersion() };
  }

  @Get('ready')
  async ready(): Promise<ReadinessResponse> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'ok', version: this.applicationVersion() };
  }

  private applicationVersion(): string {
    return (
      this.config.get<string>('APP_VERSION') ??
      this.config.get<string>('RENDER_GIT_COMMIT')?.slice(0, 12) ??
      'development'
    );
  }
}
