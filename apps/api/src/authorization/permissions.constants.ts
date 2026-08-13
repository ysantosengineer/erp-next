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

export const ADMINISTRATIVE_PERMISSIONS = Object.values(PERMISSIONS);
