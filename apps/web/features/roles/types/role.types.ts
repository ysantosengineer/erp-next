export type Permission = {
  id: string;
  code: string;
  resource?: string;
  action?: string;
  description: string | null;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
};

export type PermissionCatalogItem = Required<
  Pick<Permission, 'id' | 'code' | 'resource' | 'action'>
> & {
  description: string | null;
};

export type CreateRoleInput = { name: string; description?: string; permissionIds: string[] };
export type UpdateRoleInput = { name: string; description?: string };
