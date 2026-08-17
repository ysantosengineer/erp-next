'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PERMISSIONS } from '../../lib/permissions/permissions';
import { cn } from '../../lib/utils';
import { Can } from './can';

const navigationClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950';

export function Sidebar() {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    cn(navigationClass, pathname === href && 'bg-slate-100 text-slate-950');

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <Link className="mb-6 text-lg font-bold tracking-tight text-slate-950" href="/">
        ERP Next
      </Link>
      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        <Link className={linkClass('/')} href="/">
          Dashboard
        </Link>
        <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Cadastros
        </p>
        <Can permission={PERMISSIONS.CATEGORIES_READ}>
          <Link className={linkClass('/categories')} href="/categories">
            Categorias
          </Link>
        </Can>
        <Can permission={PERMISSIONS.UNITS_READ}>
          <Link className={linkClass('/units')} href="/units">
            Unidades de medida
          </Link>
        </Can>
        <Can permission={PERMISSIONS.SUPPLIERS_READ}>
          <Link className={linkClass('/suppliers')} href="/suppliers">
            Fornecedores
          </Link>
        </Can>
        <Can permission={PERMISSIONS.PRODUCTS_READ}>
          <Link className={linkClass('/products')} href="/products">
            Produtos
          </Link>
        </Can>
        <Can permission={PERMISSIONS.CUSTOMERS_READ}>
          <Link className={linkClass('/customers')} href="/customers">
            Clientes
          </Link>
        </Can>
        <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Estoque
        </p>
        <Can permission={PERMISSIONS.WAREHOUSES_READ}>
          <Link
            className={cn(
              navigationClass,
              pathname.startsWith('/warehouses') && 'bg-slate-100 text-slate-950',
            )}
            href="/warehouses"
          >
            Depósitos
          </Link>
        </Can>
        <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Administração
        </p>
        <Can permission={PERMISSIONS.USERS_READ}>
          <Link className={linkClass('/users')} href="/users">
            Usuários
          </Link>
        </Can>
        <Can permission={PERMISSIONS.ROLES_READ}>
          <Link className={linkClass('/roles')} href="/roles">
            Papéis e permissões
          </Link>
        </Can>
      </nav>
    </aside>
  );
}
