import { Badge } from '../../../components/ui/badge';
import type { SalesOrderStatus as Status } from '../types/sales-order.types';

const labels: Record<Status, string> = {
  DRAFT: 'Rascunho',
  CONFIRMED: 'Confirmado',
  RESERVED: 'Reservado',
  SHIPPED: 'Expedido',
  CANCELLED: 'Cancelado',
};

export function SalesOrderStatus({ status }: { status: Status }) {
  return (
    <Badge
      variant={
        status === 'CANCELLED'
          ? 'warning'
          : status === 'SHIPPED'
            ? 'success'
            : status === 'RESERVED'
              ? 'default'
              : status === 'CONFIRMED'
                ? 'success'
                : 'muted'
      }
    >
      {labels[status]}
    </Badge>
  );
}
