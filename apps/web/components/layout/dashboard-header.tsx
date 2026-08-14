'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../features/auth/hooks/use-auth';

export function DashboardHeader() {
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{user?.company.name}</p>
        <p className="text-xs text-slate-500">Ambiente ERP Next</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <button
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={isLoading}
          onClick={() => void handleLogout()}
          type="button"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
