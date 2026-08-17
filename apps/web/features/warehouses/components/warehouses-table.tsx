import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import type { Warehouse } from '../types/warehouse.types';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import { WarehouseStatusDialog } from './warehouse-status-dialog';

export function WarehousesTable({
  warehouses,
  canUpdate,
  canManageStatus,
  canReadLocations,
}: Readonly<{
  warehouses: Warehouse[];
  canUpdate: boolean;
  canManageStatus: boolean;
  canReadLocations: boolean;
}>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Endereços</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="font-medium">{warehouse.name}</TableCell>
              <TableCell>{warehouse.code}</TableCell>
              <TableCell className="max-w-72 truncate">{warehouse.description || '—'}</TableCell>
              <TableCell>{warehouse.locationCount}</TableCell>
              <TableCell>
                <Badge variant={warehouse.isActive ? 'success' : 'muted'}>
                  {warehouse.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {canReadLocations ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/warehouses/${warehouse.id}/locations`}>
                        <MapPin className="size-4" />
                        Endereços
                      </Link>
                    </Button>
                  ) : null}
                  {canUpdate ? <WarehouseFormDialog warehouse={warehouse} /> : null}
                  {canManageStatus ? <WarehouseStatusDialog warehouse={warehouse} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
