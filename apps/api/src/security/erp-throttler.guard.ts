import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { createHash } from 'node:crypto';

@Injectable()
export class ErpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(request: Request): Promise<string> {
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    if (request.path.endsWith('/auth/login')) {
      const email =
        typeof request.body?.email === 'string'
          ? request.body.email.trim().toLowerCase()
          : 'missing';
      return Promise.resolve(`${ip}:${createHash('sha256').update(email).digest('hex')}`);
    }
    return Promise.resolve(ip);
  }
}
