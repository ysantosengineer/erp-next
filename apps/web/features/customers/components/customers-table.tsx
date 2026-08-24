import { Badge } from '../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatDocument, formatPhone } from '../../../lib/br-data';
import { formatCurrency } from '../../../lib/decimal';
import type { Customer } from '../types/customer.types';
import { CustomerFormDialog } from './customer-form-dialog';
import { CustomerStatusDialog } from './customer-status-dialog';

export function CustomersTable({
  customers,
  canUpdate,
  canManageStatus,
}: Readonly<{ customers: Customer[]; canUpdate: boolean; canManageStatus: boolean }>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Limite de crédito</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="min-w-56 font-medium">
                {customer.name}
                {customer.tradeName ? (
                  <span className="block text-xs font-normal text-slate-500">
                    {customer.tradeName}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{formatDocument(customer.document)}</TableCell>
              <TableCell>
                {customer.type === 'INDIVIDUAL' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </TableCell>
              <TableCell>
                {customer.email || (customer.phone ? formatPhone(customer.phone) : '—')}
              </TableCell>
              <TableCell>{formatCurrency(customer.creditLimit)}</TableCell>
              <TableCell>
                <Badge variant={customer.isActive ? 'success' : 'muted'}>
                  {customer.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {canUpdate ? <CustomerFormDialog customer={customer} /> : null}
                  {canManageStatus ? <CustomerStatusDialog customer={customer} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
