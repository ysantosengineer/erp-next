'use client';

import { Badge } from '../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import type { Role } from '../types/role.types';
import { DeleteRoleDialog } from './delete-role-dialog';
import { RoleFormDialog } from './role-form-dialog';
import { RolePermissionsDialog } from './role-permissions-dialog';

export function RolesTable({
  roles,
  canUpdate,
  canDelete,
  canManagePermissions,
}: Readonly<{
  roles: Role[];
  canUpdate: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
}>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Permissões</TableHead>
            <TableHead>Proteção</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="min-w-44 font-medium text-slate-900">{role.name}</TableCell>
              <TableCell className="min-w-64 max-w-md">
                {role.description || <span className="text-slate-500">Sem descrição</span>}
              </TableCell>
              <TableCell>
                <Badge variant="muted">
                  {role.permissions.length}{' '}
                  {role.permissions.length === 1 ? 'permissão' : 'permissões'}
                </Badge>
              </TableCell>
              <TableCell>
                {role.isSystem ? (
                  <Badge variant="warning">Sistema</Badge>
                ) : (
                  <span className="text-slate-500">Personalizado</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex min-w-max justify-end gap-1">
                  {canUpdate ? <RoleFormDialog role={role} /> : null}
                  {canManagePermissions ? <RolePermissionsDialog role={role} /> : null}
                  {canDelete ? <DeleteRoleDialog role={role} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
