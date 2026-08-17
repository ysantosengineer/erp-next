import { Badge } from '../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatDecimalPtBr } from '../../../lib/decimal';
import type { StockLocation } from '../types/stock-location.types';
import { StockLocationFormDialog } from './stock-location-form-dialog';
import { StockLocationStatusDialog } from './stock-location-status-dialog';

export function StockLocationsTable({
  warehouseId,
  locations,
  canUpdate,
  canManageStatus,
}: Readonly<{
  warehouseId: string;
  locations: StockLocation[];
  canUpdate: boolean;
  canManageStatus: boolean;
}>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Zona</TableHead>
            <TableHead>Corredor</TableHead>
            <TableHead>Prateleira</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead>Posição</TableHead>
            <TableHead>Capacidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell className="font-medium">{location.code}</TableCell>
              <TableCell>{location.zone || '—'}</TableCell>
              <TableCell>{location.aisle || '—'}</TableCell>
              <TableCell>{location.rack || '—'}</TableCell>
              <TableCell>{location.level || '—'}</TableCell>
              <TableCell>{location.position || '—'}</TableCell>
              <TableCell>
                {location.capacity ? formatDecimalPtBr(location.capacity, 3) : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={location.isActive ? 'success' : 'muted'}>
                  {location.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {canUpdate ? (
                    <StockLocationFormDialog warehouseId={warehouseId} location={location} />
                  ) : null}
                  {canManageStatus ? (
                    <StockLocationStatusDialog warehouseId={warehouseId} location={location} />
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
