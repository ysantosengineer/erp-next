'use client';

import {
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  Factory,
  LayoutDashboard,
  ShoppingCart,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '../../features/auth/hooks/use-auth';
import { PERMISSIONS, type PermissionCode } from '../../lib/permissions/permissions';
import { cn } from '../../lib/utils';

type NavigationItem = {
  label: string;
  href: string;
  permission: PermissionCode;
};

type NavigationGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: readonly NavigationItem[];
};

const navigationGroups: readonly NavigationGroup[] = [
  {
    id: 'registrations',
    label: 'Cadastros',
    icon: ClipboardList,
    items: [
      { label: 'Categorias', href: '/categories', permission: PERMISSIONS.CATEGORIES_READ },
      { label: 'Unidades de medida', href: '/units', permission: PERMISSIONS.UNITS_READ },
      { label: 'Fornecedores', href: '/suppliers', permission: PERMISSIONS.SUPPLIERS_READ },
      { label: 'Produtos', href: '/products', permission: PERMISSIONS.PRODUCTS_READ },
      { label: 'Clientes', href: '/customers', permission: PERMISSIONS.CUSTOMERS_READ },
    ],
  },
  {
    id: 'inventory',
    label: 'Estoque',
    icon: Boxes,
    items: [
      { label: 'Saldos', href: '/inventory', permission: PERMISSIONS.INVENTORY_READ },
      {
        label: 'Movimentações',
        href: '/inventory/movements',
        permission: PERMISSIONS.INVENTORY_MOVEMENTS_READ,
      },
      {
        label: 'Reservas',
        href: '/inventory/reservations',
        permission: PERMISSIONS.INVENTORY_RESERVATIONS_READ,
      },
      { label: 'Inventários', href: '/inventory/counts', permission: PERMISSIONS.INVENTORY_COUNTS_READ },
      {
        label: 'Depósitos e endereços',
        href: '/warehouses',
        permission: PERMISSIONS.WAREHOUSES_READ,
      },
    ],
  },
  {
    id: 'purchases',
    label: 'Compras',
    icon: ShoppingCart,
    items: [
      {
        label: 'Pedidos de compra',
        href: '/purchases/orders',
        permission: PERMISSIONS.PURCHASE_ORDERS_READ,
      },
      {
        label: 'Recebimentos',
        href: '/purchases/receipts',
        permission: PERMISSIONS.PURCHASE_RECEIPTS_READ,
      },
    ],
  },
  {
    id: 'sales',
    label: 'Vendas',
    icon: Factory,
    items: [
      {
        label: 'Pedidos de venda',
        href: '/sales/orders',
        permission: PERMISSIONS.SALES_ORDERS_READ,
      },
    ],
  },
  {
    id: 'finance',
    label: 'Financeiro',
    icon: WalletCards,
    items: [
      { label: 'Contas a pagar', href: '/finance/payables', permission: PERMISSIONS.FINANCE_READ },
      {
        label: 'Contas a receber',
        href: '/finance/receivables',
        permission: PERMISSIONS.FINANCE_READ,
      },
      {
        label: 'Fluxo de caixa',
        href: '/finance/cash-flow',
        permission: PERMISSIONS.FINANCE_CASH_FLOW_READ,
      },
    ],
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: BarChart3,
    items: [
      { label: 'Vendas', href: '/reports/sales', permission: PERMISSIONS.SALES_ORDERS_READ },
      { label: 'Compras', href: '/reports/purchases', permission: PERMISSIONS.PURCHASE_ORDERS_READ },
      { label: 'Estoque', href: '/reports/inventory', permission: PERMISSIONS.INVENTORY_READ },
      { label: 'Financeiro', href: '/reports/finance', permission: PERMISSIONS.FINANCE_READ },
    ],
  },
  {
    id: 'administration',
    label: 'Administração',
    icon: ShieldCheck,
    items: [
      { label: 'Usuários', href: '/users', permission: PERMISSIONS.USERS_READ },
      { label: 'Papéis e permissões', href: '/roles', permission: PERMISSIONS.ROLES_READ },
    ],
  },
];

function matchesPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [sectionPreferences, setSectionPreferences] = useState<Record<string, boolean>>({});

  const availableGroups = useMemo(
    () =>
      navigationGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => user?.permissions.includes(item.permission)),
        }))
        .filter((group) => group.items.length > 0),
    [user?.permissions],
  );

  const toggleSection = (sectionId: string, isOpen: boolean) => {
    setSectionPreferences((current) => ({ ...current, [sectionId]: !isOpen }));
  };

  const dashboardIsActive = pathname === '/dashboard';

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-blue-900/70 bg-[#0b1f3a] p-4 text-slate-100 md:min-h-screen md:w-72 md:border-b-0 md:border-r">
      <Link className="mb-7 flex items-center gap-3 px-2 text-lg font-bold tracking-tight text-white" href="/dashboard">
        <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/30">
          <Boxes aria-hidden="true" className="size-5" />
        </span>
        ERP Next
      </Link>

      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {user?.permissions.includes(PERMISSIONS.ANALYTICS_DASHBOARD_READ) ? (
          <Link
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white',
              dashboardIsActive && 'bg-blue-600 text-white shadow-sm shadow-blue-950/30',
            )}
            href="/dashboard"
          >
            <LayoutDashboard aria-hidden="true" className="size-4" />
            Dashboard
          </Link>
        ) : null}

        <div className="my-3 border-t border-white/10" />

        {availableGroups.map((group) => {
          const hasActiveItem = group.items.some((item) => matchesPath(pathname, item.href));
          const isOpen = sectionPreferences[group.id] ?? hasActiveItem;
          const GroupIcon = group.icon;
          const contentId = `${group.id}-navigation`;

          return (
            <section key={group.id}>
              <button
                aria-controls={contentId}
                aria-expanded={isOpen}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white',
                  (isOpen || hasActiveItem) && 'text-white',
                )}
                onClick={() => toggleSection(group.id, isOpen)}
                type="button"
              >
                <GroupIcon aria-hidden="true" className="size-4 text-blue-300" />
                <span className="flex-1">{group.label}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn('size-4 transition-transform duration-200', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen ? (
                <div className="mt-1 space-y-1 border-l border-blue-300/25 pl-3" id={contentId}>
                  {group.items.map((item) => {
                    const isActive = matchesPath(pathname, item.href);
                    return (
                      <Link
                        className={cn(
                          'block rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white',
                          isActive && 'bg-blue-500/25 text-white',
                        )}
                        href={item.href}
                        key={item.href}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
