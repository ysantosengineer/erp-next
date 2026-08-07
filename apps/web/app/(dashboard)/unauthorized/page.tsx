import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <section className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-sm font-semibold text-amber-800">Acesso não autorizado</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">
        Você não possui permissão para esta área.
      </h1>
      <p className="mt-2 text-slate-700">
        Se acredita que isso é um erro, procure o administrador da empresa.
      </p>
      <Link
        className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        href="/"
      >
        Voltar ao dashboard
      </Link>
    </section>
  );
}
