'use client';

import { KeyRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  RESOURCE_LABELS,
} from '../../../lib/permissions/permissions';
import { useAuth } from '../../auth/hooks/use-auth';
import { usePermissionCatalog, useUpdateRolePermissions } from '../hooks/use-roles';
import type { PermissionCatalogItem, Role } from '../types/role.types';

const essentialPermissions = new Set<string>(Object.values(PERMISSIONS));

export function RolePermissionsDialog({ role }: Readonly<{ role: Role }>) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    role.permissions.map((permission) => permission.id),
  );
  const catalog = usePermissionCatalog(open);
  const updatePermissions = useUpdateRolePermissions();
  const auth = useAuth();

  const handleOpenChange = (value: boolean) => {
    if (value) setSelectedIds(role.permissions.map((permission) => permission.id));
    setOpen(value);
  };

  const grouped = useMemo(
    () =>
      (catalog.data ?? []).reduce<Record<string, PermissionCatalogItem[]>>((groups, permission) => {
        (groups[permission.resource] ??= []).push(permission);
        return groups;
      }, {}),
    [catalog.data],
  );

  const submit = async () => {
    try {
      await updatePermissions.mutateAsync({ id: role.id, permissionIds: selectedIds });
      toast.success('Permissões atualizadas com sucesso.');
      setOpen(false);
      await auth.refreshSession();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar as permissões.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Gerenciar permissões de ${role.name}`}
          size="sm"
          type="button"
          variant="ghost"
        >
          <KeyRound aria-hidden="true" className="size-4" />
          Permissões
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Permissões de {role.name}</DialogTitle>
          <DialogDescription>
            As permissões são organizadas por módulo e aplicadas pela API na próxima requisição
            protegida.
          </DialogDescription>
        </DialogHeader>
        {role.isSystem ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            As permissões administrativas essenciais do papel do sistema não podem ser removidas.
          </p>
        ) : null}
        <div className="mt-5 space-y-5">
          {catalog.isLoading ? (
            <p className="text-sm text-slate-500">Carregando catálogo…</p>
          ) : catalog.isError ? (
            <p className="text-sm text-red-700">
              Não foi possível carregar o catálogo de permissões.
            </p>
          ) : (
            Object.entries(grouped).map(([resource, permissions]) => (
              <fieldset className="rounded-lg border border-slate-200 p-4" key={resource}>
                <legend className="px-1 font-semibold text-slate-900">
                  {RESOURCE_LABELS[resource] ?? resource}
                </legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  {permissions.map((permission) => {
                    const checked = selectedIds.includes(permission.id);
                    const required = role.isSystem && essentialPermissions.has(permission.code);
                    return (
                      <label
                        className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-slate-50"
                        key={permission.id}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={required}
                          onCheckedChange={(value) =>
                            setSelectedIds(
                              value
                                ? [...selectedIds, permission.id]
                                : selectedIds.filter((id) => id !== permission.id),
                            )
                          }
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-800">
                            {PERMISSION_LABELS[permission.code] ??
                              permission.description ??
                              permission.code}
                          </span>
                          <code className="text-xs text-slate-500">{permission.code}</code>
                          {required ? (
                            <span className="ml-2 text-xs font-medium text-amber-700">
                              Obrigatória
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            disabled={catalog.isLoading || catalog.isError || updatePermissions.isPending}
            onClick={() => void submit()}
            type="button"
          >
            {updatePermissions.isPending ? 'Salvando…' : 'Salvar permissões'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
