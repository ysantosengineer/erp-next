import Link from 'next/link';
import { Can } from './can';

const navigationClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950';

export function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <Link className="mb-6 text-lg font-bold tracking-tight text-slate-950" href="/">
        ERP Next
      </Link>
      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        <Link className={`${navigationClass} bg-slate-100`} href="/">
          Dashboard
        </Link>
        <Can permission="users.read">
          <span
            className={`${navigationClass} cursor-not-allowed text-slate-400`}
            title="Módulo em construção"
          >
            Usuários
          </span>
        </Can>
        <Can permission="roles.read">
          <span
            className={`${navigationClass} cursor-not-allowed text-slate-400`}
            title="Módulo em construção"
          >
            Papéis e permissões
          </span>
        </Can>
      </nav>
    </aside>
  );
}
