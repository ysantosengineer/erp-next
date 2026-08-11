import { Checkbox } from '../../../components/ui/checkbox';
import type { Role } from '../../roles/types/role.types';

export function RoleCheckboxList({
  roles,
  selectedIds,
  disabled,
  onChange,
}: Readonly<{
  roles: Role[];
  selectedIds: string[];
  disabled?: boolean;
  onChange(roleIds: string[]): void;
}>) {
  if (!roles.length) return <p className="text-sm text-slate-500">Nenhum papel disponível.</p>;

  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
      {roles.map((role) => {
        const checked = selectedIds.includes(role.id);
        return (
          <label
            className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-slate-50"
            key={role.id}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(value) =>
                onChange(
                  value ? [...selectedIds, role.id] : selectedIds.filter((id) => id !== role.id),
                )
              }
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">{role.name}</span>
              {role.description ? (
                <span className="block text-xs text-slate-500">{role.description}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
