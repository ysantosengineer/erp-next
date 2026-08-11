'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Pagination } from '../../../components/shared/pagination';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { usePermission } from '../../../components/navigation/can';
import { useAuth } from '../../auth/hooks/use-auth';
import { useUsers } from '../hooks/use-users';
import type { ListUsersParams, UserStatusFilter } from '../types/user.types';
import { CreateUserDialog } from './create-user-dialog';
import { UsersTable } from './users-table';

const PAGE_SIZE = 20;

export function UsersPage() {
  const { user } = useAuth();
  const canCreate = usePermission(PERMISSIONS.USERS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.USERS_UPDATE);
  const canManageStatus = usePermission(PERMISSIONS.USERS_MANAGE_STATUS);
  const hasManageRoles = usePermission(PERMISSIONS.USERS_MANAGE_ROLES);
  const canReadRoles = usePermission(PERMISSIONS.ROLES_READ);
  const canManageRoles = hasManageRoles && canReadRoles;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [status, setStatus] = useState<'all' | UserStatusFilter>('all');
  const [page, setPage] = useState(1);

  const params = useMemo<ListUsersParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status !== 'all' ? { status } : {}),
      sortBy: 'name',
      sortOrder: 'asc',
    }),
    [debouncedSearch, page, status],
  );
  const users = useUsers(params);
  const result = users.data;

  return (
    <div className="space-y-7">
      <PageHeader
        action={canCreate ? <CreateUserDialog canAssignRoles={canManageRoles} /> : undefined}
        description="Cadastre acessos, ajuste informações e controle os papéis atribuídos dentro da empresa atual."
        eyebrow="Administração"
        title="Usuários"
      />

      <section
        aria-label="Filtros de usuários"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px]"
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            aria-label="Pesquisar por nome ou e-mail"
            className="pl-9"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Pesquisar por nome ou e-mail"
            type="search"
            value={search}
          />
        </div>
        <Select
          onValueChange={(value) => {
            setStatus(value as 'all' | UserStatusFilter);
            setPage(1);
          }}
          value={status}
        >
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section
        aria-busy={users.isLoading}
        aria-label="Lista de usuários"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {users.isLoading ? (
          <div className="space-y-3 p-5" data-testid="users-loading">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : users.isError ? (
          <ErrorState
            message={getApiErrorMessage(users.error, 'Não foi possível carregar os usuários.')}
            onRetry={() => void users.refetch()}
          />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            description={
              search || status !== 'all'
                ? 'Revise a pesquisa ou os filtros aplicados.'
                : 'Crie o primeiro usuário para começar a delegar acessos.'
            }
            title="Nenhum usuário encontrado"
          />
        ) : (
          <>
            <UsersTable
              canManageRoles={canManageRoles}
              canManageStatus={canManageStatus}
              canUpdate={canUpdate}
              currentUserId={user?.id}
              users={result.data}
            />
            <Pagination
              itemLabel="usuários"
              onPageChange={setPage}
              page={result.meta.page}
              pageSize={result.meta.limit}
              total={result.meta.total}
              totalPages={result.meta.totalPages}
            />
          </>
        )}
      </section>
    </div>
  );
}
