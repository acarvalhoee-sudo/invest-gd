import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, MoreHorizontal, Pencil, Copy, Trash2,
  Zap, SunMedium, Droplets, Wind, RefreshCw, Leaf,
  AlertCircle, LayoutList, LayoutGrid,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useStudies } from '@/hooks/useStudies'
import { fmtBRL, fmtPotencia } from '@/utils/formatters'
import { FONTE_LABELS } from '@/types/study'
import type { FonteGeracao, Study } from '@/types/study'

import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'
import { Input }  from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/* ------------------------------------------------------------------ */
/* FonteIcon                                                           */
/* ------------------------------------------------------------------ */
function FonteIcon({ fonte, className = 'w-4 h-4' }: { fonte: FonteGeracao; className?: string }) {
  switch (fonte) {
    case 'ufv':
    case 'solar':    return <SunMedium className={className} />
    case 'cgh':
    case 'pch':      return <Droplets  className={className} />
    case 'eolica':   return <Wind      className={className} />
    case 'biomassa':
    case 'biogas':   return <Leaf      className={className} />
    default:         return <Zap       className={className} />
  }
}

/* ------------------------------------------------------------------ */
/* TableSkeleton                                                        */
/* ------------------------------------------------------------------ */
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-4 bg-muted rounded w-24" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* KanbanSkeleton                                                       */
/* ------------------------------------------------------------------ */
function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-border shadow-sm p-4 animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* KanbanCard                                                           */
/* ------------------------------------------------------------------ */
function KanbanCard({ study, duplicating, onEdit, onDuplicate, onDelete }: {
  study: Study; duplicating: boolean
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const a = study.ativo
  const fonteKey = (a.fonte === 'solar' ? 'ufv' : a.fonte) as FonteGeracao

  return (
    <div
      className="bg-white rounded-xl border border-border shadow-sm p-4 flex flex-col gap-3 cursor-pointer
                 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
      onClick={onEdit}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight truncate">
            {a.nomeEstudo || '(sem nome)'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.nomeUsina}</p>
        </div>

        {/* Ações — para o click do card não propagar */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acoes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} disabled={duplicating}>
                <Copy className="w-3.5 h-3.5" />
                {duplicating ? 'Duplicando...' : 'Duplicar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Badge Fonte */}
      <Badge variant={fonteKey} className="self-start flex items-center gap-1">
        <FonteIcon fonte={fonteKey} className="w-3 h-3" />
        {FONTE_LABELS[fonteKey] ?? a.fonte}
      </Badge>

      {/* Dados */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Potencia</span>
          <span className="tabular-nums font-medium text-foreground">
            {fmtPotencia(a.potencia, a.fonte === 'ufv' || a.fonte === 'solar')}
          </span>
        </div>
        <div className="flex justify-between">
          <span>CAPEX Total</span>
          <span className="tabular-nums font-semibold text-foreground">
            {fmtBRL(study.capex.total)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Criado em</span>
          <span>
            {format(new Date(study.criadoEm), 'dd MMM yyyy', { locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* StudyRow (tabela)                                                    */
/* ------------------------------------------------------------------ */
function StudyRow({ study, duplicating, onEdit, onDuplicate, onDelete }: {
  study: Study; duplicating: boolean
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const a = study.ativo
  const fonteKey = (a.fonte === 'solar' ? 'ufv' : a.fonte) as FonteGeracao

  return (
    <tr>
      <td>
        <div>
          <p className="font-medium text-foreground text-sm leading-tight">{a.nomeEstudo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{a.nomeUsina}</p>
        </div>
      </td>
      <td>
        <Badge variant={fonteKey}>
          <FonteIcon fonte={fonteKey} className="w-3 h-3" />
          {FONTE_LABELS[fonteKey] ?? a.fonte}
        </Badge>
      </td>
      <td className="text-sm tabular-nums">
        {fmtPotencia(a.potencia, a.fonte === 'ufv' || a.fonte === 'solar')}
      </td>
      <td>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {fmtBRL(study.capex.total)}
        </span>
      </td>
      <td className="text-sm tabular-nums text-muted-foreground">
        {study.tarifas.tarifaVenda > 0 ? `R$ ${study.tarifas.tarifaVenda.toFixed(2)}/MWh` : '---'}
      </td>
      <td className="text-xs text-muted-foreground">
        {format(new Date(study.criadoEm), 'dd MMM yyyy', { locale: ptBR })}
      </td>
      <td className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acoes</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} disabled={duplicating}>
              <Copy className="w-3.5 h-3.5" />
              {duplicating ? 'Duplicando...' : 'Duplicar'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/* DashboardPage                                                        */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { studies, loading, error, reload, remove, duplicate } = useStudies()

  const [search,      setSearch]      = useState('')
  const [filterFonte, setFilterFonte] = useState<FonteGeracao | 'all'>('all')
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [viewMode,    setViewMode]    = useState<'list' | 'kanban'>('list')

  const filtered = useMemo(() => {
    return studies.filter((s) => {
      const term = search.toLowerCase()
      const matchSearch =
        s.ativo.nomeEstudo.toLowerCase().includes(term) ||
        s.ativo.nomeUsina.toLowerCase().includes(term)
      const matchFonte = filterFonte === 'all' || s.ativo.fonte === filterFonte
      return matchSearch && matchFonte
    })
  }, [studies, search, filterFonte])

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    await remove(deleteId)
    setDeleting(false)
    setDeleteId(null)
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id)
    const newId = await duplicate(id)
    setDuplicating(null)
    if (newId) navigate(`/estudos/${newId}/editar`)
  }

  return (
    <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Estudos de Viabilidade</h1>
          <p className="page-subtitle">Gerencie e analise seus ativos de geracao distribuida</p>
        </div>
        <Button onClick={() => navigate('/estudos/novo')} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Novo Estudo
        </Button>
      </div>

      {/* Barra de filtros + toggle */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome do estudo ou usina..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterFonte} onValueChange={(v) => setFilterFonte(v as FonteGeracao | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todas as fontes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            <SelectItem value="ufv">UFV</SelectItem>
            <SelectItem value="cgh">CGH</SelectItem>
            <SelectItem value="pch">PCH</SelectItem>
            <SelectItem value="eolica">Eolica</SelectItem>
            <SelectItem value="biomassa">Biomassa</SelectItem>
            <SelectItem value="biogas">Biogas</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle Lista / Kanban */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 shrink-0">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setViewMode('list')}
            title="Visualizacao em lista"
          >
            <LayoutList className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setViewMode('kanban')}
            title="Visualizacao em kanban"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>

        <Button variant="outline" size="icon" onClick={reload} title="Atualizar">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Erro de conexao</p>
            <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reload} className="ml-auto shrink-0">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* === KANBAN === */}
      {viewMode === 'kanban' ? (
        loading ? (
          <KanbanSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground py-20">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                {search || filterFonte !== 'all' ? 'Nenhum resultado encontrado' : 'Nenhum estudo cadastrado'}
              </p>
              <p className="text-sm mt-0.5">
                {search || filterFonte !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Crie seu primeiro estudo de viabilidade'}
              </p>
            </div>
            {!search && filterFonte === 'all' && (
              <Button className="mt-1" onClick={() => navigate('/estudos/novo')}>
                <Plus className="w-4 h-4" /> Criar primeiro estudo
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((study) => (
                <KanbanCard
                  key={study.id}
                  study={study}
                  duplicating={duplicating === study.id}
                  onEdit={() => navigate(`/estudos/${study.id}/editar`)}
                  onDuplicate={() => handleDuplicate(study.id!)}
                  onDelete={() => setDeleteId(study.id!)}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {filtered.length} estudo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              {studies.length !== filtered.length && ` de ${studies.length} no total`}
            </p>
          </>
        )
      ) : (
        /* === LISTA === */
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estudo / Usina</th>
                  <th>Fonte</th>
                  <th>Potencia</th>
                  <th>CAPEX Total</th>
                  <th>Tarifa Venda</th>
                  <th>Criado em</th>
                  <th className="text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                          <Zap className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {search || filterFonte !== 'all'
                              ? 'Nenhum resultado encontrado'
                              : 'Nenhum estudo cadastrado'}
                          </p>
                          <p className="text-sm mt-0.5">
                            {search || filterFonte !== 'all'
                              ? 'Tente ajustar os filtros de busca'
                              : 'Crie seu primeiro estudo de viabilidade'}
                          </p>
                        </div>
                        {!search && filterFonte === 'all' && (
                          <Button className="mt-1" onClick={() => navigate('/estudos/novo')}>
                            <Plus className="w-4 h-4" /> Criar primeiro estudo
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((study) => (
                    <StudyRow
                      key={study.id}
                      study={study}
                      duplicating={duplicating === study.id}
                      onEdit={() => navigate(`/estudos/${study.id}/editar`)}
                      onDuplicate={() => handleDuplicate(study.id!)}
                      onDelete={() => setDeleteId(study.id!)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {filtered.length} estudo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                {studies.length !== filtered.length && ` de ${studies.length} no total`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dialogo de exclusao */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir estudo</DialogTitle>
            <DialogDescription>
              Esta acao nao pode ser desfeita. O estudo sera removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" loading={deleting} onClick={confirmDelete}>
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
