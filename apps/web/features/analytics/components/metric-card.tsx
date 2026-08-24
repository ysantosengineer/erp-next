type Props = {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'good' | 'warning';
};

export function MetricCard({ label, value, detail, tone = 'default' }: Readonly<Props>) {
  const color =
    tone === 'good' ? 'text-emerald-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-950';
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </article>
  );
}
