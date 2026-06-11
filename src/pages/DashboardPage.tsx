/**
 * DashboardPage.tsx
 * Tela principal — listagem de estudos com filtros, estatísticas e ações
 * Estética: Stripe / Vercel Dashboard
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, MoreHorizontal, Pencil, Copy, Trash2,
  Zap, SunMedium, Droplets, Wind, RefreshCw,
  TrendingUp, Building2, CircleDollarSign, LayoutGrid,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

import { useStudies } from '@/hooks/useStudies'
import { fmtBRL, fmtCompact, fmtPotencia } from '@/utils/formatters'
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

// ─── Ícone de fonte ────────────────────────────────────────────

function FonteIcon({ fonte, className = 'w-4 h-4' }: { fonte: FonteGeracao; className?: string }) {
  const cls = className
  switch (fonte) {
    case 'solar':  return <SunMedium className={cls} />
    case 'cgh':    return <Droplets  className={cls} />
    case 'pch':    return <Droplets  className={cls} />
    case 'eolica': return <Wind      className={cls} />
    default:       return <Zap       className={cls} />
  }
}

// ─── Skeleton loader ──────────────────────────────────────────

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

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string
}) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value text-lg">{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { studies, loading, error, reload, remove, duplicate } = useStudies()

  const [search,     setSearch]     = useState('')
  const [filterFonte, setFilterFonte] = useState<FonteGeracao | 'all'>('all')
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  // ─── Filtro ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return studies.filter((s) => {
      const term = search.toLowerCase()
      const matchSearch =
        s.dadosUsina.nomeEstudo.toLowerCase().includes(term) ||
        s.dadosUsina.nomeUsina.toLowerCase().includes(term)
      const matchFonte = filterFonte === 'all' || s.dadosUsina.fonte === filterFonte
      return matchSearch && matchFonte
    })
  }, [studies, search, filterFonte])

  // ─── Estatísticas ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalPotencia     = studies.reduce((s, e) => s + e.dadosUsina.potencia, 0)
    const totalInvestimento = studies.reduce((s, e) => s + e.dadosUsina.investimentoTotal, 0)
    const porFonte = studies.reduce<Record<string, number>>((acc, e) => {
      acc[e.dadosUsina.fonte] = (acc[e.dadosUsina.fonte] ?? 0) + 1
      return acc
    }, {})
    return { totalPotencia, totalInvestimento, porFonte }
  }, [studies])

  // ─── Handlers ─────────────────────────────────────────────────

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

  // ─── UI ──────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Estudos de Viabilidade</h1>
          <p className="page-subtitle">
            Gerencie e analise seus ativos de geração distribuída
          </p>
        </div>
        <Button onClick={() => navigate('/estudos/novo')} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Novo Estudo
        </Button>
      </div>

      {/* Stats */}
      {!loading && !error && studies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<LayoutGrid className="w-4 h-4" />}
            label="Total de Estudos"
            value={studies.length.toString()}
            sub={`${Object.keys(stats.porFonte).length} fonte${Object.keys(stats.porFonte).length !== 1 ? 's' : ''}`}
          />
          <StatCard
            icon={<Building2 className="w-4 h-4" />}
            label="Potência Total"
            value={`${stats.totalPotencia.toLocaleString('pt-BR')} kW`}
            sub="Capacidade instalada"
          />
          <StatCard
            icon={<CircleDollarSign className="w-4 h-4" />}
            label="Investimento Total"
            value={fmtCompact(stats.totalInvestimento)}
            sub="Soma do portfólio"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Média por Estudo"
            value={fmtCompact(studies.length ? stats.totalInvestimento / studies.length : 0)}
            sub="Investimento médio"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome do estudo ou usina…"
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
            <SelectItem value="solar">☀️ Solar (UFV)</SelectItem>
            <SelectItem value="cgh">💧 CGH</SelectItem>
            <SelectItem value="pch">🌊 PCH</SelectItem>
            <SelectItem value="eolica">💨 Eólica</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={reload} title="Atualizar">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Erro de conexão</p>
            <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reload} className="ml-auto shrink-0">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Estudo / Usina</th>
                <th>Fonte</th>
                <th>Potência</th>
                <th>Custo Usina</th>
                <th>Custo Rede</th>
                <th>Investimento Total</th>
                <th>Criado em</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {search || filterFonte !== 'all' ? 'Nenhum resultado encontrado' : 'Nenhum estudo cadastrado'}
                        </p>
                        <p className="text-sm mt-0.5">
                          {search || filterFonte !== 'all'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Crie seu primeiro estudo de viabilidade'
                          }
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

        {/* Table footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} estudo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              {studies.length !== filtered.length && ` de ${studies.length} no total`}
            </p>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir estudo</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O estudo será removido permanentemente do Firestore.
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

// ─── Linha da tabela ──────────────────────────────────────────

function StudyRow({ study, duplicating, onEdit, onDuplicate, onDelete }: {
  study:       Study
  duplicating: boolean
  onEdit:      () => void
  onDuplicate: () => void
  onDelete:    () => void
}) {
  const u = study.dadosUsina

  return (
    <tr>
      {/* Estudo / Usina */}
      <td>
        <div>
          <p className="font-medium text-foreground text-sm leading-tight">{u.nomeEstudo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{u.nomeUsina}</p>
        </div>
      </td>

      {/* Fonte */}
      <td>
        <Badge variant={u.fonte as 'solar' | 'cgh' | 'pch' | 'eolica'}>
          <FonteIcon fonte={u.fonte} className="w-3 h-3" />
          {FONTE_LABELS[u.fonte]}
        </Badge>
      </td>

      {/* Potência */}
      <td className="text-sm tabular-nums">
        {fmtPotencia(u.potencia, u.fonte === 'solar')}
      </td>

      {/* Custo Usina */}
      <td className="text-sm tabular-nums text-muted-foreground">
        {fmtBRL(u.custoUsina)}
      </td>

      {/* Custo Rede */}
      <td className="text-sm tabular-nums text-muted-foreground">
        {fmtBRL(u.custoObraRede)}
      </td>

      {/* Investimento Total */}
      <td>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {fmtBRL(u.investimentoTotal)}
        </span>
      </td>

      {/* Data */}
      <td className="text-xs text-muted-foreground">
        {format(new Date(study.criadoEm), "dd MMM yyyy", { locale: ptBR })}
      </td>

      {/* Ações */}
      <td className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="w-4 h-4" />
              <span className="sr-only">Ações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} disabled={duplicating}>
              <Copy className="w-3.5 h-3.5" />
              {duplicating ? 'Duplicando…' : 'Duplicar'}
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
