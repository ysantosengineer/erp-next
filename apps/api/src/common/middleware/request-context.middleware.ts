import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../../auth/auth.types';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,100}$/;

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  use(request: Request, response: Response, next: NextFunction): void {
    const supplied = request.header('x-request-id');
    const requestId = supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('Cache-Control', 'no-store');
    const startedAt = performance.now();
    response.on('finish', () => {
      const identity = (request as Request & { user?: AuthenticatedUser }).user;
      this.logger.log(
        JSON.stringify({
          requestId,
          method: request.method,
          path: request.originalUrl.split('?')[0],
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
          ...(identity ? { userId: identity.userId, companyId: identity.companyId } : {}),
        }),
      );
    });
    next();
  }
}
