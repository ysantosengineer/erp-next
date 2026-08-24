import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  app.enableShutdownHooks();

  const port = Number.parseInt(process.env.PORT ?? process.env.API_PORT ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
