'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '../../../components/shared/page-header';
import { Pagination } from '../../../components/shared/pagination';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { EmptyState, ErrorState } from '../../../components/shared/data-state';
import { Skeleton } from '../../../components/ui/skeleton';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { apiClient } from '../../../lib/api/api-client';
import type { PermissionCode } from '../../../lib/permissions/permissions';
import { usePermission } from '../../../components/navigation/can';

type CatalogItem = { id: string; name: string; symbol?: string; description: string | null; isActive: boolean };
type CatalogResult = { data: CatalogItem[]; meta: { page: number; limit: number; total: number; totalPages: number } };
type Props = { resource: 'categories' | 'units'; title: string; hasSymbol?: boolean; permissions: { create: PermissionCode; update: PermissionCode; status: PermissionCode } };

export function CatalogPage({ resource, title, hasSymbol = false, permissions }: Readonly<Props>) {
  const [page, setPage] = useState(1); const [name, setName] = useState(''); const [symbol, setSymbol] = useState(''); const [description, setDescription] = useState(''); const [search, setSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('all'); const client = useQueryClient();
  const debouncedSearch = useDebouncedValue(search.trim());
  const params = useMemo(() => new URLSearchParams({ page: String(page), limit: '20', sortBy: 'name', sortOrder: 'asc', ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(statusFilter === 'all' ? {} : { status: statusFilter }) }).toString(), [debouncedSearch, page, statusFilter]);
  const query = useQuery({ queryKey: [resource, params], queryFn: () => apiClient.get<CatalogResult>(`/${resource}?${params}`) });
  const canCreate = usePermission(permissions.create); const canUpdate = usePermission(permissions.update); const canStatus = usePermission(permissions.status);
  const refresh = () => client.invalidateQueries({ queryKey: [resource] });
  const create = useMutation({ mutationFn: () => apiClient.post<CatalogItem, object>(`/${resource}`, { name, ...(hasSymbol ? { symbol } : {}), ...(description ? { description } : {}) }), onSuccess: () => { setName(''); setSymbol(''); setDescription(''); refresh(); toast.success('Registro criado com sucesso.'); } });
  const status = useMutation({ mutationFn: (item: CatalogItem) => apiClient.patch<CatalogItem, { isActive: boolean }>(`/${resource}/${item.id}/status`, { isActive: !item.isActive }), onSuccess: refresh });
  const data = useMemo(() => query.data?.data ?? [], [query.data]);
  return <div className="space-y-7"><PageHeader eyebrow="Cadastros" title={title} description="Consulte, cadastre e controle o status dos registros da empresa atual." />
    {canCreate ? <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); void create.mutateAsync().catch(() => toast.error('Não foi possível criar o registro.')); }}><Input aria-label="Nome" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" required minLength={2}/>{hasSymbol ? <Input aria-label="Símbolo" value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="Símbolo" required/> : null}<Input aria-label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição (opcional)"/><Button type="submit" disabled={create.isPending}>Adicionar</Button></form> : null}
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input aria-label="Pesquisar" className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Pesquisar" type="search"/></div><Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}><SelectTrigger aria-label="Filtrar por status"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="inactive">Inativos</SelectItem></SelectContent></Select></section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{query.isLoading ? <div className="p-5" data-testid="catalog-loading"><Skeleton className="h-32 w-full"/></div> : query.isError ? <ErrorState message={getApiErrorMessage(query.error, 'Não foi possível carregar os registros.')} onRetry={() => void query.refetch()}/> : !data.length ? <EmptyState title={`Nenhuma ${title.toLowerCase()} encontrada`} description="Revise a pesquisa, os filtros ou crie o primeiro registro."/> : <><Table><TableHeader><TableRow><TableHead>Nome</TableHead>{hasSymbol ? <TableHead>Símbolo</TableHead> : null}<TableHead>Descrição</TableHead><TableHead>Status</TableHead><TableHead>Criado em</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{data.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.name}</TableCell>{hasSymbol ? <TableCell>{item.symbol}</TableCell> : null}<TableCell>{item.description || '—'}</TableCell><TableCell><Badge variant={item.isActive ? 'success' : 'muted'}>{item.isActive ? 'Ativo' : 'Inativo'}</Badge></TableCell><TableCell>—</TableCell><TableCell className="text-right">{canUpdate ? <Button size="sm" variant="ghost">Editar</Button> : null}{canStatus ? <Button size="sm" variant="ghost" onClick={() => void status.mutateAsync(item).then(() => toast.success(item.isActive ? 'Registro inativado.' : 'Registro ativado.')).catch((error) => toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o status.')))}> {item.isActive ? 'Inativar' : 'Ativar'} </Button> : null}</TableCell></TableRow>)}</TableBody></Table><Pagination itemLabel={title.toLowerCase()} page={query.data!.meta.page} pageSize={query.data!.meta.limit} total={query.data!.meta.total} totalPages={query.data!.meta.totalPages} onPageChange={setPage}/></>}</section></div>;
}
