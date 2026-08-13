import { Badge } from '../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatDocument, formatPhone } from '../schemas/supplier.schema';
import type { Supplier } from '../types/supplier.types';
import { SupplierFormDialog } from './supplier-form-dialog';
import { SupplierStatusDialog } from './supplier-status-dialog';
export function SuppliersTable({
  suppliers,
  canUpdate,
  canManageStatus,
}: Readonly<{ suppliers: Supplier[]; canUpdate: boolean; canManageStatus: boolean }>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="min-w-56 font-medium">
                {s.name}
                {s.tradeName ? (
                  <span className="block text-xs font-normal text-slate-500">{s.tradeName}</span>
                ) : null}
              </TableCell>
              <TableCell>{formatDocument(s.document)}</TableCell>
              <TableCell>{s.type === 'INDIVIDUAL' ? 'Pessoa Física' : 'Pessoa Jurídica'}</TableCell>
              <TableCell>{s.contactName || s.email || '—'}</TableCell>
              <TableCell>{s.phone ? formatPhone(s.phone) : '—'}</TableCell>
              <TableCell>
                <Badge variant={s.isActive ? 'success' : 'muted'}>
                  {s.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {canUpdate ? <SupplierFormDialog supplier={s} /> : null}
                  {canManageStatus ? <SupplierStatusDialog supplier={s} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
