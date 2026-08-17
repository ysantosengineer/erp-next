import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../../../components/ui/badge';
import { buttonVariants } from '../../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../lib/utils';
import { formatCurrency, formatDecimalPtBr } from '../schemas/product.schema';
import type { Product } from '../types/product.types';
import { ProductStatusDialog } from './product-status-dialog';

export function ProductsTable({
  products,
  canUpdate,
  canManageStatus,
}: Readonly<{ products: Product[]; canUpdate: boolean; canManageStatus: boolean }>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">Venda</TableHead>
            <TableHead className="text-right">Estoque mínimo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="min-w-56 font-medium">
                {product.name}
                {product.barcode ? (
                  <span className="block text-xs font-normal text-slate-500">
                    {product.barcode}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="font-mono text-xs">{product.sku}</TableCell>
              <TableCell>{product.category.name}</TableCell>
              <TableCell>{product.unit.symbol}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(product.costPrice)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(product.salePrice)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatDecimalPtBr(product.minimumStock, 3)}
              </TableCell>
              <TableCell>
                <Badge variant={product.isActive ? 'success' : 'muted'}>
                  {product.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {canUpdate ? (
                    <Link
                      className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }))}
                      href={`/products/${product.id}/edit`}
                    >
                      <Pencil className="size-4" /> Editar
                    </Link>
                  ) : null}
                  {canManageStatus ? <ProductStatusDialog product={product} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
