import { Badge } from '../../../components/ui/badge';
import type { InventoryCountStatus } from '../types/inventory-count.types';

export const inventoryCountStatusLabels: Record<InventoryCountStatus, string> = {
  DRAFT: 'Rascunho',
  IN_PROGRESS: 'Em contagem',
  RECOUNT_REQUIRED: 'Recontagem pendente',
  READY_FOR_APPROVAL: 'Pronto para aprovação',
  APPROVED: 'Aprovado',
  CANCELLED: 'Cancelado',
};

const variants: Record<InventoryCountStatus, 'default' | 'success' | 'muted' | 'warning'> = {
  DRAFT: 'muted',
  IN_PROGRESS: 'default',
  RECOUNT_REQUIRED: 'warning',
  READY_FOR_APPROVAL: 'default',
  APPROVED: 'success',
  CANCELLED: 'muted',
};

export function InventoryCountStatusBadge({ status }: Readonly<{ status: InventoryCountStatus }>) {
  return <Badge variant={variants[status]}>{inventoryCountStatusLabels[status]}</Badge>;
}
