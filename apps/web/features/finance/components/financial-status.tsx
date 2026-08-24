import { Badge } from '../../../components/ui/badge';
import type { FinancialEntryStatus } from '../types/finance.types';

const labels: Record<FinancialEntryStatus, string> = {
  OPEN: 'Em aberto',
  PARTIALLY_SETTLED: 'Parcial',
  SETTLED: 'Liquidado',
  CANCELLED: 'Cancelado',
};
export function FinancialStatus({
  status,
  overdue,
}: {
  status: FinancialEntryStatus;
  overdue?: boolean;
}) {
  if (overdue) return <Badge variant="warning">Vencido</Badge>;
  return (
    <Badge
      variant={
        status === 'SETTLED'
          ? 'success'
          : status === 'CANCELLED'
            ? 'muted'
            : status === 'PARTIALLY_SETTLED'
              ? 'warning'
              : 'default'
      }
    >
      {labels[status]}
    </Badge>
  );
}
