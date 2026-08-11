import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  itemLabel,
  onPageChange,
}: Readonly<{
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  itemLabel: string;
  onPageChange(page: number): void;
}>) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-slate-600">
        Exibindo {first}–{last} de {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" className="size-4" /> Anterior
        </Button>
        <span className="min-w-24 text-center text-slate-600">
          Página {page} de {Math.max(totalPages, 1)}
        </span>
        <Button
          aria-label="Próxima página"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          Próxima <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
