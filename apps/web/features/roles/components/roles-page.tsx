'use client';

import { EmptyState, ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { usePermission } from '../../../components/navigation/can';
import { Skeleton } from '../../../components/ui/skeleton';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { useRoles } from '../hooks/use-roles';
import { RoleFormDialog } from './role-form-dialog';
import { RolesTable } from './roles-table';

export function RolesPage() {
  const roles = useRoles();
  const canCreate = usePermission(PERMISSIONS.ROLES_CREATE);
  const canUpdate = usePermission(PERMISSIONS.ROLES_UPDATE);
  const canDelete = usePermission(PERMISSIONS.ROLES_DELETE);
  const canManagePermissions = usePermission(PERMISSIONS.ROLES_MANAGE_PERMISSIONS);
  const result = roles.data;

  return (
    <div className="space-y-7">
      <PageHeader
        action={canCreate ? <RoleFormDialog /> : undefined}
        description="Crie conjuntos de acesso e defina quais operações cada papel pode executar na empresa."
        eyebrow="Administração"
        title="Papéis e permissões"
      />
      <section
        aria-busy={roles.isLoading}
        aria-label="Lista de papéis"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {roles.isLoading ? (
          <div className="space-y-3 p-5" data-testid="roles-loading">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : roles.isError ? (
          <ErrorState
            message={getApiErrorMessage(roles.error, 'Não foi possível carregar os papéis.')}
            onRetry={() => void roles.refetch()}
          />
        ) : !result || result.length === 0 ? (
          <EmptyState
            description="Crie o primeiro papel para organizar o acesso da equipe."
            title="Nenhum papel cadastrado"
          />
        ) : (
          <RolesTable
            canDelete={canDelete}
            canManagePermissions={canManagePermissions}
            canUpdate={canUpdate}
            roles={result}
          />
        )}
      </section>
    </div>
  );
}
