'use client';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

type Props = {
  startDate: string;
  endDate: string;
  onChange: (period: { startDate: string; endDate: string }) => void;
};

export function PeriodFilter({ startDate, endDate, onChange }: Readonly<Props>) {
  const preset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    onChange({
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
  };
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="text-sm font-medium text-slate-700">
        Início
        <Input
          className="mt-1"
          type="date"
          value={startDate}
          onChange={(event) => onChange({ startDate: event.target.value, endDate })}
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Fim
        <Input
          className="mt-1"
          type="date"
          value={endDate}
          onChange={(event) => onChange({ startDate, endDate: event.target.value })}
        />
      </label>
      <Button type="button" variant="outline" onClick={() => preset(7)}>
        7 dias
      </Button>
      <Button type="button" variant="outline" onClick={() => preset(30)}>
        30 dias
      </Button>
      <Button type="button" variant="outline" onClick={() => preset(90)}>
        90 dias
      </Button>
    </div>
  );
}
