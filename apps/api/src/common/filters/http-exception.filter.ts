import { Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
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
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno.' };
    const details = isExceptionResponse(exceptionResponse)
      ? (exceptionResponse.details ??
        (Array.isArray(exceptionResponse.message) ? exceptionResponse.message : undefined))
      : undefined;
    const message = isExceptionResponse(exceptionResponse)
      ? exceptionResponse.message
      : exceptionResponse;

    response.status(statusCode).json({
      statusCode,
      code:
        isExceptionResponse(exceptionResponse) && exceptionResponse.code
          ? exceptionResponse.code
          : HttpStatus[statusCode],
      message: Array.isArray(message) ? 'Dados inválidos.' : message,
      ...(details ? { details } : {}),
      requestId: request.header('x-request-id') ?? randomUUID(),
    });
  }
}
