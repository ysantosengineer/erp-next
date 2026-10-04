import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';

const capabilities = [
  {
    title: 'Operação comercial em um só lugar',
    description: 'Cadastros, pedidos, compras e financeiro conectados à rotina da sua empresa.',
    icon: ClipboardList,
  },
  {
    title: 'Estoque com rastreabilidade',
    description: 'Acompanhe saldos, movimentações, reservas e alertas antes que virem urgência.',
    icon: Boxes,
  },
  {
    title: 'Visão para decidir com clareza',
    description: 'Indicadores e relatórios que transformam registros operacionais em direção.',
    icon: BarChart3,
  },
];

const operatingPrinciples = [
  'Acesso e permissões por função',
  'Histórico de operações importantes',
  'Dados centralizados por empresa',
];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="border-b border-slate-800 bg-slate-950">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <Link className="flex items-center gap-3 font-semibold tracking-tight text-white" href="/landing">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-700 text-white shadow-sm shadow-blue-950/20">
              <Boxes aria-hidden="true" className="size-5" />
            </span>
            <span>ERP Next</span>
          </Link>

          <Link
            className="rounded-lg border border-slate-500 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-blue-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
            href="/login"
          >
            Entrar
          </Link>
        </header>

        <section className="mx-auto grid w-full max-w-7xl gap-14 px-6 pb-20 pt-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-sm font-medium text-blue-200">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Gestão comercial com dados confiáveis
            </p>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              A operação da sua empresa, organizada para avançar.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              O ERP Next reúne vendas, compras, estoque e financeiro em uma experiência simples para
              acompanhar o que importa todos os dias.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
                href="/login"
              >
                Acessar ambiente
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
                href="#modulos"
              >
                Conhecer módulos
              </a>
            </div>
          </div>

          <ProductPreview />
        </section>
      </div>

      <section className="border-y border-slate-800 bg-slate-900" id="modulos">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold text-blue-300">Módulos que conversam entre si</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Do registro diário à decisão gerencial.
            </h2>
            <p className="mt-4 max-w-md leading-7 text-slate-400">
              Informações de compras, vendas, estoque e financeiro permanecem conectadas para reduzir
              retrabalho e dar contexto às equipes.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {capabilities.map(({ title, description, icon: Icon }) => (
              <article className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm" key={title}>
                <span className="grid size-10 place-items-center rounded-lg bg-blue-400/10 text-blue-300">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
        <div>
          <p className="text-sm font-semibold text-blue-300">Feito para a rotina real</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Uma operação rastreável, sem perder agilidade.
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {operatingPrinciples.map((principle) => (
            <li className="flex gap-3 text-sm leading-6 text-slate-300" key={principle}>
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-300" />
              {principle}
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="font-medium text-slate-100">ERP Next</p>
          <div className="flex items-center gap-4">
            <span>Gestão para pequenas e médias empresas</span>
            <Link className="font-semibold text-slate-100 hover:text-blue-300" href="/login">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-3 shadow-2xl shadow-slate-950/40 sm:p-5">
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-md bg-blue-700 text-white">
              <ReceiptText aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Pedido de venda</p>
              <p className="text-xs text-slate-500">PV-2026-0241</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Em preparação
          </span>
        </div>

        <div className="grid md:grid-cols-[9rem_1fr]">
          <aside className="hidden border-r border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 md:block">
            <p className="mb-4 font-semibold uppercase tracking-wide text-slate-400">Pedido</p>
            <p className="rounded-md bg-blue-50 px-3 py-2 font-semibold text-blue-700">Informações</p>
            <p className="px-3 py-2">Itens</p>
            <p className="px-3 py-2">Valores</p>
          </aside>
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</p>
                <p className="mt-1 font-semibold text-slate-900">Varejo Horizonte Ltda.</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Entrega prevista</p>
                <p className="mt-1 font-semibold text-slate-900">18 set. 2026</p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Itens do pedido</span>
                <span>Valor</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-sm text-slate-700">
                <span>Kit organizador modular <small className="ml-1 text-slate-400">× 12</small></span>
                <span className="font-medium">R$ 1.188,00</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
                <span>Caixa para expedição <small className="ml-1 text-slate-400">× 30</small></span>
                <span className="font-medium">R$ 342,00</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">2 itens</p>
              <p className="text-sm font-semibold text-slate-950">Total <span className="ml-2 text-lg">R$ 1.530,00</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
