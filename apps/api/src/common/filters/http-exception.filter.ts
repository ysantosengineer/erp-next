import { Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

type ExceptionResponse = {
  code?: string;
  message?: string | string[];
  details?: unknown;
};

function isExceptionResponse(value: unknown): value is ExceptionResponse {
  return typeof value === 'object' && value !== null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const prismaConflict =
      exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002';
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : prismaConflict
          ? HttpStatus.CONFLICT
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : prismaConflict
          ? { code: 'RESOURCE_CONFLICT', message: 'Recurso em conflito.' }
          : { code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno.' };
    const details = isExceptionResponse(exceptionResponse)
      ? (exceptionResponse.details ??
        (Array.isArray(exceptionResponse.message) ? exceptionResponse.message : undefined))
      : undefined;
    const message = isExceptionResponse(exceptionResponse)
      ? exceptionResponse.message
      : exceptionResponse;

    const requestId = request.header('x-request-id') ?? randomUUID();
    if (statusCode >= 500)
      this.logger.error(
        JSON.stringify({
          requestId,
          method: request.method,
          path: request.originalUrl.split('?')[0],
          statusCode,
        }),
        exception instanceof Error ? exception.stack : undefined,
      );
    response.status(statusCode).json({
      statusCode,
      code:
        isExceptionResponse(exceptionResponse) && exceptionResponse.code
          ? exceptionResponse.code
          : HttpStatus[statusCode],
      message: Array.isArray(message) ? 'Dados inválidos.' : message,
      ...(details ? { details } : {}),
      requestId,
    });
  }
}
