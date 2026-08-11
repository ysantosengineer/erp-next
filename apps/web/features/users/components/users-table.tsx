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
import type { User } from '../types/user.types';
import { EditUserDialog } from './edit-user-dialog';
import { UserRolesDialog } from './user-roles-dialog';
import { UserStatusDialog } from './user-status-dialog';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export function UsersTable({
  users,
  currentUserId,
  canUpdate,
  canManageStatus,
  canManageRoles,
}: Readonly<{
  users: User[];
  currentUserId?: string;
  canUpdate: boolean;
  canManageStatus: boolean;
  canManageRoles: boolean;
}>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papéis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="min-w-44 font-medium text-slate-900">
                {user.name}
                {user.id === currentUserId ? (
                  <span className="ml-2 text-xs font-normal text-slate-500">Você</span>
                ) : null}
              </TableCell>
              <TableCell className="min-w-56">{user.email}</TableCell>
              <TableCell className="min-w-48">
                <div className="flex flex-wrap gap-1">
                  {user.roles.length ? (
                    user.roles.map((role) => (
                      <Badge key={role.id} variant="muted">
                        {role.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-500">Sem papel</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'success' : 'muted'}>
                  {user.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {dateFormatter.format(new Date(user.createdAt))}
              </TableCell>
              <TableCell>
                <div className="flex min-w-max justify-end gap-1">
                  {canUpdate ? <EditUserDialog user={user} /> : null}
                  {canManageRoles ? <UserRolesDialog user={user} /> : null}
                  {canManageStatus ? (
                    <UserStatusDialog isCurrentUser={user.id === currentUserId} user={user} />
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
