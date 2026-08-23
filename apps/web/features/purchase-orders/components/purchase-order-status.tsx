import { Badge } from '../../../components/ui/badge';
import type { PurchaseOrderStatus as Status } from '../types/purchase-order.types';
const labels: Record<Status, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  PARTIALLY_RECEIVED: 'Parcialmente recebido',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};
export function PurchaseOrderStatus({ status }: { status: Status }) {
  return <Badge variant="muted">{labels[status]}</Badge>;
}
