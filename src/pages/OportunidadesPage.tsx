/**
 * OportunidadesPage.tsx — FASE 03
 * Ranking automático de estudos por TIR/VPL/Payback.
 * Top 10 destacados. Sem alterar motor de cálculo.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown,
  SunMedium, Droplets, Wind, Leaf, Zap, Star, Download,
} from 'lucide-react'
import { useStudies }      from '@/hooks/useStudies'
import { fmtBRL, fmtNum }  from '@/utils/formatters'
import { FONTE_LABELS, STATUS_COLORS, STUDY_STATUSES } from '@/types/study'
import type { FonteGeracao, Study, StudyStatus } from '@/types/study'
import { Badge }   from '@/components/ui/badge'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const V  = '#0B5E3B'
const OR = '#ea580c'

/* Fonte icon */
function FonteIcon({ fonte, className = 'w-4 h-4' }: { fonte: FonteGeracao; className?: string }) {
  switch (fonte) {
    case 'ufv': case 'solar': return <SunMedium className={className} />
    case 'cgh': case 'pch':   return <Droplets  className={className} />
    case 'eolica':            return <Wind      className={className} />
    case 'biomassa': case 'biogas': return <Leaf className={className} />
    default:                  return <Zap       className={className} />
  }
}

/* Status badge */
function StatusBadge({ status }: { status: StudyStatus }) {
  const color = STATUS_COLORS[status] ?? '#64748b'
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'2px 8px',
      borderRadius:12, fontSize:10, fontWeight:700,
      background: color + '18', color, border: `1px solid ${color}44`,
      whiteSpace:'nowrap',
    }}>
      {status}
    </span>
  )
}

/* Sort icon */
function SortIcon({ col, sortCol, dir }: { col:string; sortCol:string; dir:'asc'|'desc' }) {
  if (col !== sortCol) return <ChevronsUpDown className="w-3 h-3 opacity-30" />
  return dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

type SortCol = 'tir' | 'vpl' | 'payback' | 'capex' | 'potencia' | 'nome'

/* CSV export */
function exportCSV(rows: Array<Study & { rank: number }>) {
  const headers = ['Rank','Nome','Usina','Fonte','Estado','Potência (kW)','CAPEX (R$)','TIR (%)','VPL (R$)','Payback (anos)','Status','Tags']
  const data = rows.map((s) => [
    s.rank,
    s.ativo.nomeEstudo,
    s.ativo.nomeUsina,
    FONTE_LABELS[(s.ativo.fonte==='solar'?'ufv':s.ativo.fonte) as FonteGeracao] ?? s.ativo.fonte,
    s.ativo.estado,
    s.ativo.potencia,
    s.capex.total,
    s.resultados?.tir ?? '',
    s.resultados?.vpl ?? '',
    s.resultados?.paybackSimples ?? '',
    s.status,
    (s.tags??[]).join(', '),
  ])
  const csv = [headers, ...data]
    .map((r) => r.map((v) => `"${String(v??'').replace(/"/g,'""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'oportunidades-gd.csv'; a.click()
  URL.revokeObjectURL(url)
}

/* Score computation: weighted composite */
function score(s: Study): number {
  const tir     = Number(s.resultados?.tir ?? 0)
  const vpl     = Number(s.resultados?.vpl ?? 0)
  const payback = Number(s.resultados?.paybackSimples ?? 999)
  // Normalize: TIR 0-40%, VPL in R$ (cap at 10M), payback 0-25 anos
  const tirN    = Math.min(tir / 40, 1) * 40
  const vplN    = Math.min(vpl / 10_000_000, 1) * 40
  const pbN     = Math.max(0, 1 - payback / 25) * 20
  return tirN + vplN + pbN
}

export default function OportunidadesPage() {
  const navigate = useNavigate()
  const { studies, loading } = useStudies()

  const [search,      setSearch]      = useState('')
  const [filterFonte, setFilterFonte] = useState('all')
  const [filterStatus,setFilterStatus]= useState('all')
  const [sortCol,     setSortCol]     = useState<SortCol>('tir')
  const [sortDir,     setSortDir]     = useState<'asc'|'desc'>('desc')

  /* Only studies with at least TIR or VPL */
  const withResults = useMemo(() =>
    studies.filter((s) => s.resultados?.tir != null || s.resultados?.vpl != null),
    [studies]
  )

  /* Filter */
  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return withResults.filter((s) => {
      const a = s.ativo
      if (term && !a.nomeEstudo.toLowerCase().includes(term) && !a.nomeUsina.toLowerCase().includes(term)) return false
      if (filterFonte  !== 'all' && a.fonte !== filterFonte)  return false
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      return true
    })
  }, [withResults, search, filterFonte, filterStatus])

  /* Sort */
  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      switch (sortCol) {
        case 'tir':     return dir * (Number(a.resultados?.tir??-999) - Number(b.resultados?.tir??-999))
        case 'vpl':     return dir * (Number(a.resultados?.vpl??-9e9) - Number(b.resultados?.vpl??-9e9))
        case 'payback': return dir * (Number(a.resultados?.paybackSimples??999) - Number(b.resultados?.paybackSimples??999))
        case 'capex':   return dir * ((a.capex.total??0) - (b.capex.total??0))
        case 'potencia':return dir * ((a.ativo.potencia??0) - (b.ativo.potencia??0))
        case 'nome':    return dir * (a.ativo.nomeEstudo??'').localeCompare(b.ativo.nomeEstudo??'')
        default:        return 0
      }
    })
    return arr.map((s, i) => ({ ...s, rank: i + 1 }))
  }, [filtered, sortCol, sortDir])

  /* Auto-rank by composite score for Top 10 identification */
  const top10ids = useMemo(() => {
    const scored = withResults
      .filter((s) => s.status !== 'Reprovado' && s.status !== 'Arquivado')
      .map((s) => ({ id: s.id!, score: score(s) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.id)
    return new Set(scored)
  }, [withResults])

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const TH = ({ col, label }: { col: SortCol; label: string }) => (
    <th onClick={() => toggleSort(col)} style={{
      padding:'9px 12px', textAlign:'right', fontWeight:700, color:'#475569',
      fontSize:10, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap',
      cursor:'pointer', userSelect:'none',
    }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, float:'right' }}>
        {label}
        <SortIcon col={col} sortCol={sortCol} dir={sortDir} />
      </span>
    </th>
  )

  /* Stats cards */
  const stats = useMemo(() => {
    const vals = sorted.slice(0, 10)
    const avgTir = vals.length > 0 ? vals.reduce((s, x) => s + Number(x.resultados?.tir??0), 0) / vals.length : 0
    const totVpl  = vals.reduce((s, x) => s + Number(x.resultados?.vpl??0), 0)
    const totCapex = vals.reduce((s, x) => s + (x.capex.total??0), 0)
    return { avgTir, totVpl, totCapex, count: withResults.length }
  }, [sorted, withResults])

  return (
    <div style={{ padding:'20px 28px', maxWidth:1400, margin:'0 auto', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background: V, borderRadius:10, padding:8 }}>
            <TrendingUp style={{ color:'white', width:20, height:20 }} />
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:900, color:'#1e293b', margin:0 }}>Oportunidades</h1>
            <p style={{ fontSize:12, color:'#64748b', margin:'2px 0 0' }}>
              Ranking automático por TIR · VPL · Payback
            </p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="outline" size="sm" onClick={() => exportCSV(sorted)} style={{ gap:5 }}>
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} style={{ gap:5 }}>
            {'← Dashboard'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'Estudos com Resultados', value: stats.count, color:'#1e293b' },
          { label:'TIR Média Top 10',       value: fmtNum(stats.avgTir,2)+'%',  color: V   },
          { label:'VPL Total Top 10',       value: fmtBRL(stats.totVpl,0),      color: stats.totVpl>=0?'#15803d':'#dc2626' },
          { label:'CAPEX Total Top 10',     value: fmtBRL(stats.totCapex,0),    color: OR  },
        ].map((c) => (
          <div key={c.label} style={{ background:'white', borderRadius:10, border:'1px solid #e2e8f0', padding:'12px 14px', borderLeft:`3px solid ${c.color}` }}>
            <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.7, margin:'0 0 4px' }}>{c.label}</p>
            <p style={{ fontSize:18, fontWeight:900, color:c.color, margin:0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:'white', borderRadius:10, border:'1px solid #e2e8f0', padding:'10px 14px', marginBottom:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth:220, fontSize:13 }}
        />
        <Select value={filterFonte} onValueChange={setFilterFonte}>
          <SelectTrigger style={{ maxWidth:160 }}><SelectValue placeholder="Fonte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            {(['ufv','cgh','pch','eolica','biomassa','biogas'] as FonteGeracao[]).map((f) => (
              <SelectItem key={f} value={f}>{FONTE_LABELS[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger style={{ maxWidth:200 }}><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STUDY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#64748b' }}>
          <div style={{ width:12, height:12, borderRadius:3, background:'#fef9c3', border:'2px solid #f59e0b' }} />
          Top 10 (score composto TIR+VPL+Payback)
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:700, color:'#475569', fontSize:10, textTransform:'uppercase', width:48 }}>#</th>
                <th onClick={() => toggleSort('nome')} style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:10, textTransform:'uppercase', cursor:'pointer', userSelect:'none' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    Estudo / Usina <SortIcon col="nome" sortCol={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:10, textTransform:'uppercase' }}>Fonte</th>
                <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:10, textTransform:'uppercase' }}>Estado</th>
                <TH col="potencia" label="Potência" />
                <TH col="capex"   label="CAPEX" />
                <TH col="tir"     label="TIR (%)" />
                <TH col="vpl"     label="VPL (R$)" />
                <TH col="payback" label="Payback" />
                <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:10, textTransform:'uppercase' }}>Status</th>
                <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:10, textTransform:'uppercase' }}>Tags</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:5}).map((_,i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  {Array.from({length:11}).map((_,j) => (
                    <td key={j} style={{ padding:'11px 12px' }}><div style={{ height:12, background:'#f1f5f9', borderRadius:4, width:'80%' }} /></td>
                  ))}
                </tr>
              )) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', fontSize:13 }}>
                    Nenhum estudo com resultados calculados.
                    <br /><span style={{ fontSize:11 }}>Preencha ao menos até o passo de Resultados para aparecer aqui.</span>
                  </td>
                </tr>
              ) : sorted.map((s, idx) => {
                const fonteKey = (s.ativo.fonte === 'solar' ? 'ufv' : s.ativo.fonte) as FonteGeracao
                const isTop = top10ids.has(s.id!)
                const isSolar = s.ativo.fonte === 'ufv' || s.ativo.fonte === 'solar'
                const tir  = s.resultados?.tir     != null ? Number(s.resultados.tir)     : null
                const vpl  = s.resultados?.vpl     != null ? Number(s.resultados.vpl)     : null
                const pb   = s.resultados?.paybackSimples != null ? Number(s.resultados.paybackSimples) : null

                return (
                  <tr key={s.id} onClick={() => navigate(`/estudos/${s.id}/editar`)}
                    style={{
                      borderBottom:'1px solid #f1f5f9', cursor:'pointer',
                      background: isTop && idx < 3 ? '#f0fdf4' : isTop ? '#fffbeb' : 'white',
                      transition:'background 0.1s',
                    }}>
                    {/* Rank */}
                    <td style={{ padding:'10px 12px', textAlign:'center' }}>
                      <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%',
                        background: idx===0 ? '#f59e0b' : idx===1 ? '#94a3b8' : idx===2 ? '#cd7c2f' : isTop ? '#f0fdf4' : '#f8fafc',
                        color: idx < 3 ? 'white' : isTop ? V : '#94a3b8',
                        fontWeight:900, fontSize:12, border: isTop && idx>=3 ? `1px solid ${V}33` : 'none',
                      }}>
                        {isTop && idx >= 3 ? <Star style={{ width:12, height:12, fill: '#f59e0b', color:'#f59e0b' }} /> : null}
                        {idx < 3 ? s.rank : idx >= 3 && !isTop ? s.rank : null}
                      </div>
                    </td>

                    {/* Nome */}
                    <td style={{ padding:'10px 12px' }}>
                      <p style={{ fontWeight:700, fontSize:13, color:'#1e293b', margin:0 }}>{s.ativo.nomeEstudo||'(sem nome)'}</p>
                      <p style={{ fontSize:10, color:'#94a3b8', margin:'2px 0 0' }}>{s.ativo.nomeUsina}</p>
                    </td>

                    {/* Fonte */}
                    <td style={{ padding:'10px 12px' }}>
                      <Badge variant={fonteKey} className="flex items-center gap-1 text-xs">
                        <FonteIcon fonte={fonteKey} className="w-3 h-3" />{FONTE_LABELS[fonteKey]??s.ativo.fonte}
                      </Badge>
                    </td>

                    {/* Estado */}
                    <td style={{ padding:'10px 12px', fontSize:12, color:'#475569' }}>{s.ativo.estado||'—'}</td>

                    {/* Potência */}
                    <td style={{ padding:'10px 12px', fontSize:12, fontWeight:600, color:'#1e293b', textAlign:'right' }}>
                      {fmtNum(s.ativo.potencia,0)} {isSolar?'kWp':'kW'}
                    </td>

                    {/* CAPEX */}
                    <td style={{ padding:'10px 12px', fontSize:12, fontWeight:600, color:'#1e293b', textAlign:'right', whiteSpace:'nowrap' }}>
                      {fmtBRL(s.capex.total,0)}
                    </td>

                    {/* TIR */}
                    <td style={{ padding:'10px 12px', textAlign:'right' }}>
                      {tir != null
                        ? <span style={{ fontSize:13, fontWeight:900, color: tir >= 15 ? '#15803d' : tir >= 8 ? '#d97706' : '#dc2626' }}>{fmtNum(tir,2)}%</span>
                        : <span style={{ color:'#cbd5e1', fontSize:11 }}>—</span>}
                    </td>

                    {/* VPL */}
                    <td style={{ padding:'10px 12px', textAlign:'right' }}>
                      {vpl != null
                        ? <span style={{ fontSize:12, fontWeight:700, color: vpl >= 0 ? '#15803d' : '#dc2626', whiteSpace:'nowrap' }}>{fmtBRL(vpl,0)}</span>
                        : <span style={{ color:'#cbd5e1', fontSize:11 }}>—</span>}
                    </td>

                    {/* Payback */}
                    <td style={{ padding:'10px 12px', textAlign:'right' }}>
                      {pb != null
                        ? <span style={{ fontSize:12, fontWeight:700, color: pb <= 5 ? '#15803d' : pb <= 10 ? '#d97706' : '#dc2626' }}>{fmtNum(pb,1)} anos</span>
                        : <span style={{ color:'#cbd5e1', fontSize:11 }}>—</span>}
                    </td>

                    {/* Status */}
                    <td style={{ padding:'10px 12px' }}><StatusBadge status={s.status} /></td>

                    {/* Tags */}
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                        {(s.tags??[]).slice(0,2).map((t) => (
                          <span key={t} style={{ background:'#f0fdf4', color:V, border:`1px solid ${V}33`, borderRadius:99, fontSize:9, fontWeight:600, padding:'1px 6px' }}>{t}</span>
                        ))}
                        {(s.tags??[]).length > 2 && <span style={{ fontSize:9, color:'#94a3b8' }}>+{(s.tags??[]).length-2}</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && sorted.length > 0 && (
          <div style={{ padding:'8px 14px', borderTop:'1px solid #f1f5f9' }}>
            <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>
              {sorted.length} estudo{sorted.length!==1?'s':''} com resultados calculados
              {withResults.length !== sorted.length ? ` (${withResults.length} no total)` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
