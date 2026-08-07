export type ApiErrorPayload = {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
  requestId?: string;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(statusCode: number, payload: ApiErrorPayload) {
    super(payload.message ?? 'Não foi possível concluir a solicitação.');
    this.name = 'ApiError';
    this.statusCode = payload.statusCode ?? statusCode;
    this.code = payload.code ?? 'UNEXPECTED_ERROR';
    this.requestId = payload.requestId;
  }
}
