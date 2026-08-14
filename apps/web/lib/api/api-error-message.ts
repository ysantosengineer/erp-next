import { ApiError } from './api-error';

const messages: Readonly<Record<string, string>> = {
  API_UNAVAILABLE: 'Não foi possível conectar à API. Tente novamente em instantes.',
  ACCESS_DENIED: 'Você não possui permissão para concluir esta ação.',
  INVALID_SESSION: 'Sua sessão expirou. Entre novamente.',
  EMAIL_ALREADY_EXISTS: 'Este e-mail já está sendo utilizado.',
  USER_NOT_FOUND: 'O usuário não foi encontrado.',
  ROLE_NOT_FOUND: 'O papel não foi encontrado.',
  PERMISSION_NOT_FOUND: 'Uma das permissões selecionadas não está disponível.',
  SELF_DEACTIVATION_NOT_ALLOWED: 'Você não pode inativar a própria conta.',
  LAST_ADMINISTRATOR: 'A empresa deve manter ao menos um administrador ativo.',
  ROLE_NAME_EXISTS: 'Já existe um papel com este nome.',
  ROLE_IN_USE: 'Este papel está atribuído a usuários e não pode ser excluído.',
  SYSTEM_ROLE_PROTECTED: 'Este papel do sistema é protegido.',
  SYSTEM_ROLE_PERMISSIONS_REQUIRED:
    'O papel do sistema deve manter as permissões administrativas essenciais.',
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return messages[error.code] ?? fallback;
}
