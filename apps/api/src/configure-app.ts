import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { corsOrigins } from './config/environment';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const production = config.get<string>('NODE_ENV') === 'production';
  const origins = corsOrigins(config.getOrThrow<string>('CORS_ORIGINS'));
  const expressApp = app.getHttpAdapter().getInstance() as {
    disable(name: string): void;
    set(name: string, value: number): void;
  };
  expressApp.disable('x-powered-by');
  const trustProxyHops = config.get<number>('TRUST_PROXY_HOPS') ?? 0;
  if (trustProxyHops > 0) expressApp.set('trust proxy', trustProxyHops);
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.use(
    helmet({
      contentSecurityPolicy: false,
      strictTransportSecurity: production ? undefined : false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(express.json({ limit: config.get<string>('REQUEST_BODY_LIMIT') ?? '256kb' }));
  app.use(
    express.urlencoded({
      extended: false,
      limit: config.get<string>('REQUEST_BODY_LIMIT') ?? '256kb',
    }),
  );
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  if (config.get<string>('SWAGGER_ENABLED') === 'true') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('ERP Next API')
        .setDescription('API do ERP Next.')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }
}
