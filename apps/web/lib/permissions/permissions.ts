export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_MANAGE_STATUS: 'users.manage_status',
  USERS_MANAGE_ROLES: 'users.manage_roles',
  ROLES_READ: 'roles.read',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_MANAGE_PERMISSIONS: 'roles.manage_permissions',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_LABELS: Readonly<Record<string, string>> = {
  'users.read': 'Visualizar usuários',
  'users.create': 'Criar usuários',
  'users.update': 'Editar usuários',
  'users.manage_status': 'Gerenciar status de usuários',
  'users.manage_roles': 'Gerenciar papéis de usuários',
  'roles.read': 'Visualizar papéis',
  'roles.create': 'Criar papéis',
  'roles.update': 'Editar papéis',
  'roles.delete': 'Excluir papéis',
  'roles.manage_permissions': 'Gerenciar permissões de papéis',
};

export const RESOURCE_LABELS: Readonly<Record<string, string>> = {
  users: 'Usuários',
  roles: 'Papéis',
};
