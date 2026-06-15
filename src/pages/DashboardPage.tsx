/**
 * DashboardPage.tsx — Lista + Kanban toggle
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, MoreHorizontal, Pencil, Copy, Trash2,
  SunMedium, Droplets, Wind, Leaf, Zap,
  RefreshCw, AlertCircle, LayoutList, LayoutGrid,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useStudies }     from '@/hooks/useStudies'
import { fmtBRL, fmtNum } from '@/utils/formatters'
import { FONTE_LABELS, STUDY_STATUSES, STATUS_COLORS } from '@/types/study'
import type { FonteGeracao, Study, StudyStatus } from '@/types/study'

import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Badge }   from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/* ── Fonte icon ── */
function FonteIcon({ fonte, className = 'w-4 h-4' }: { fonte: FonteGeracao; className?: string }) {
  switch (fonte) {
    case 'ufv': case 'solar': return <SunMedium className={className} />
    case 'cgh': case 'pch':   return <Droplets  className={className} />
    case 'eolica':            return <Wind      className={className} />
    case 'biomassa': case 'biogas': return <Leaf className={className} />
    default:                  return <Zap       className={className} />
  }
}

/* ── Skeleton row ── */
function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, width: i === 0 ? '70%' : '55%' }} />
        </td>
      ))}
    </tr>
  )
}

/* ─────────────────────────────────────────────
   KANBAN CARD
───────────────────────────────────────────── */
function KanbanCard({ study, duplicating, onOpen, onDuplicate, onDelete }: {
  study: Study; duplicating: boolean
  onOpen: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const a       = study.ativo
  const fonteKey = (a.fonte === 'solar' ? 'ufv' : a.fonte) as FonteGeracao
  const isSolar  = a.fonte === 'ufv' || a.fonte === 'solar'
  const res      = study.resultados
  const tir      = res?.tir != null ? Number(res.tir) : null
  const vpl      = res?.vpl != null ? Number(res.vpl) : null

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'white',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        padding: '12px 14px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'box-shadow 0.15s, transform 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.05)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.nomeEstudo || '(sem nome)'}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.nomeUsina}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}><Pencil className="w-3.5 h-3.5" /> Abrir / Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} disabled={duplicating}><Copy className="w-3.5 h-3.5" />{duplicating ? 'Duplicando…' : 'Duplicar'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /> Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Fonte badge */}
      <Badge variant={fonteKey} className="flex items-center gap-1 text-xs w-fit">
        <FonteIcon fonte={fonteKey} className="w-3 h-3" />
        {FONTE_LABELS[fonteKey] ?? a.fonte}
      </Badge>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontSize: 11 }}>
        <span style={{ color: '#94a3b8' }}>Potência</span>
        <span style={{ fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{fmtNum(a.potencia, 0)} {isSolar ? 'kWp' : 'kW'}</span>
        <span style={{ color: '#94a3b8' }}>CAPEX</span>
        <span style={{ fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{fmtBRL(study.capex.total, 0)}</span>
        {tir != null && (
          <>
            <span style={{ color: '#94a3b8' }}>TIR</span>
            <span style={{ fontWeight: 700, color: tir >= 15 ? '#15803d' : tir >= 8 ? '#d97706' : '#dc2626', textAlign: 'right' }}>{fmtNum(tir, 2)}%</span>
          </>
        )}
        {vpl != null && (
          <>
            <span style={{ color: '#94a3b8' }}>VPL</span>
            <span style={{ fontWeight: 700, color: vpl >= 0 ? '#15803d' : '#dc2626', textAlign: 'right' }}>{fmtBRL(vpl, 0)}</span>
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   KANBAN COLUMN
───────────────────────────────────────────── */
function KanbanColumn({ status, studies, duplicating, onOpen, onDuplicate, onDelete }: {
  status: StudyStatus
  studies: Study[]
  duplicating: string | null
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const color = STATUS_COLORS[status] ?? '#64748b'
  return (
    <div style={{
      flex: '0 0 240px',
      background: '#f8fafc',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      padding: '10px 10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minHeight: 120,
    }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>{status}</span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#94a3b8',
          background: '#e2e8f0', borderRadius: 99, padding: '1px 7px',
        }}>
          {studies.length}
        </span>
      </div>

      {/* Cards */}
      {studies.map((s) => (
        <KanbanCard
          key={s.id}
          study={s}
          duplicating={duplicating === s.id}
          onOpen={() => onOpen(s.id!)}
          onDuplicate={() => onDuplicate(s.id!)}
          onDelete={() => onDelete(s.id!)}
        />
      ))}
      {studies.length === 0 && (
        <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 11, padding: '20px 0' }}>
          Nenhum estudo
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   DASHBOARD PAGE
───────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { studies, loading, error, reload, remove, duplicate } = useStudies()

  const [search,      setSearch]      = useState('')
  const [filterFonte, setFilterFonte] = useState('all')
  const [viewMode,    setViewMode]    = useState<'list' | 'kanban'>(() => {
    try { return (localStorage.getItem('dashboard-view') as 'list' | 'kanban') ?? 'list' }
    catch { return 'list' }
  })
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  function switchView(v: 'list' | 'kanban') {
    setViewMode(v)
    try { localStorage.setItem('dashboard-view', v) } catch {}
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return studies.filter((s) => {
      const a = s.ativo
      if (term && !a.nomeEstudo.toLowerCase().includes(term) && !a.nomeUsina.toLowerCase().includes(term)) return false
      if (filterFonte !== 'all' && a.fonte !== filterFonte) return false
      return true
    })
  }, [studies, search, filterFonte])

  // Kanban: group by status
  const kanbanCols = useMemo(() => {
    const cols: Record<StudyStatus, Study[]> = {} as Record<StudyStatus, Study[]>
    STUDY_STATUSES.forEach((st) => { cols[st] = [] })
    filtered.forEach((s) => { cols[s.status ?? 'Em Elaboração'].push(s) })
    return cols
  }, [filtered])

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

  function fmtDate(s: Study) {
    const raw = s.criadoEm
    if (!raw) return '—'
    try { return format(new Date(raw), 'dd/MM/yyyy', { locale: ptBR }) } catch { return '—' }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: -0.3 }}>
          Estudos de Viabilidade
        </h1>
        <Button size="sm" onClick={() => navigate('/estudos/novo')} style={{ gap: 6, fontWeight: 700 }}>
          <Plus className="w-4 h-4" /> Novo Estudo
        </Button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8', pointerEvents: 'none' }} />
          <Input style={{ paddingLeft: 34, fontSize: 13 }} placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={filterFonte} onValueChange={setFilterFonte}>
          <SelectTrigger style={{ width: 180, fontSize: 13 }}>
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            {(['ufv', 'cgh', 'pch', 'eolica', 'biomassa', 'biogas', 'outros'] as FonteGeracao[]).map((f) => (
              <SelectItem key={f} value={f}>{FONTE_LABELS[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, border: '1px solid #e2e8f0', borderRadius: 8, padding: 3, background: '#f8fafc' }}>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => switchView('list')}
            title="Visualização em lista"
            style={viewMode === 'list' ? { background: '#0B5E3B', color: 'white' } : {}}
          >
            <LayoutList className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => switchView('kanban')}
            title="Visualização Kanban"
            style={viewMode === 'kanban' ? { background: '#0B5E3B', color: 'white' } : {}}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>

        <Button variant="outline" size="icon" onClick={reload} title="Atualizar">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle style={{ color: '#dc2626', width: 16, height: 16, flexShrink: 0 }} />
          <p style={{ color: '#dc2626', margin: 0, fontSize: 13, flex: 1 }}>{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>Tentar novamente</Button>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Nome do Estudo', 'Usina', 'Fonte', 'Potência', 'CAPEX', 'TIR', 'VPL', 'Criado em', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 16px',
                    textAlign: i >= 3 && i <= 6 ? 'right' : i === 8 ? 'right' : 'left',
                    fontWeight: 600, color: '#64748b', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
                      {studies.length === 0
                        ? 'Nenhum estudo cadastrado. Clique em "+ Novo Estudo" para começar.'
                        : 'Nenhum estudo encontrado com os filtros aplicados.'}
                    </td>
                  </tr>
                )
                : filtered.map((s) => {
                  const a        = s.ativo
                  const fonteKey = (a.fonte === 'solar' ? 'ufv' : a.fonte) as FonteGeracao
                  const isSolar  = a.fonte === 'ufv' || a.fonte === 'solar'
                  const res      = s.resultados
                  const tir      = res?.tir != null ? Number(res.tir) : null
                  const vpl      = res?.vpl != null ? Number(res.vpl) : null

                  return (
                    <tr key={s.id} onClick={() => navigate(`/estudos/${s.id}/editar`)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      <td style={{ padding: '13px 16px', maxWidth: 220 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.nomeEstudo || '(sem nome)'}
                        </p>
                      </td>
                      <td style={{ padding: '13px 16px', maxWidth: 180 }}>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nomeUsina || '—'}</p>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <Badge variant={fonteKey} className="flex items-center gap-1 text-xs w-fit">
                          <FonteIcon fonte={fonteKey} className="w-3 h-3" />
                          {FONTE_LABELS[fonteKey] ?? a.fonte}
                        </Badge>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                        {fmtNum(a.potencia, 0)} {isSolar ? 'kWp' : 'kW'}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                        {fmtBRL(s.capex.total, 0)}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        {tir != null
                          ? <span style={{ fontSize: 13, fontWeight: 700, color: tir >= 15 ? '#15803d' : tir >= 8 ? '#d97706' : '#dc2626' }}>{fmtNum(tir, 2)}%</span>
                          : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {vpl != null
                          ? <span style={{ fontSize: 13, fontWeight: 700, color: vpl >= 0 ? '#15803d' : '#dc2626' }}>{fmtBRL(vpl, 0)}</span>
                          : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(s)}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/estudos/${s.id}/editar`)}>
                              <Pencil className="w-3.5 h-3.5" /> Abrir / Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(s.id!)} disabled={duplicating === s.id}>
                              <Copy className="w-3.5 h-3.5" />{duplicating === s.id ? 'Duplicando…' : 'Duplicar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setDeleteId(s.id!)}>
                              <Trash2 className="w-3.5 h-3.5" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
          {!loading && filtered.length > 0 && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                {filtered.length} estudo{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== studies.length ? ` de ${studies.length}` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── KANBAN VIEW — grade de cards sem colunas de status ── */}
      {viewMode === 'kanban' && (
        loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, height: 160 }}>
                <div style={{ height: 14, background: '#f1f5f9', borderRadius: 4, width: '70%', marginBottom: 10 }} />
                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 4, width: '50%', marginBottom: 16 }} />
                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 4, width: '40%', marginBottom: 8 }} />
                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 4, width: '60%' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
            {studies.length === 0
              ? 'Nenhum estudo cadastrado. Clique em "+ Novo Estudo" para começar.'
              : 'Nenhum estudo encontrado com os filtros aplicados.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filtered.map((s) => (
              <KanbanCard
                key={s.id}
                study={s}
                duplicating={duplicating === s.id}
                onOpen={() => navigate(`/estudos/${s.id}/editar`)}
                onDuplicate={() => handleDuplicate(s.id!)}
                onDelete={() => setDeleteId(s.id!)}
              />
            ))}
          </div>
        )
      )}

      {/* Modal Excluir */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir estudo</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. O estudo será removido permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" loading={deleting} onClick={confirmDelete}>Excluir permanentemente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
