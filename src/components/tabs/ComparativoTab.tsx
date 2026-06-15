/**
 * ComparativoTab.tsx — Comparacao de cenarios (FASE 04)
 * Tabela de indicadores com highlight melhor/medio/pior
 * + Graficos de barras comparativos (Recharts)
 * + Exportar Comparativo PDF (jsPDF)
 */
import { useMemo, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { FileDown, Loader2 } from 'lucide-react'
import type { Study }    from '@/types/study'
import { useScenarios }  from '@/hooks/useScenarios'
import { fmtBRL, fmtNum } from '@/utils/formatters'

const V   = '#0B5E3B'
const OR  = '#ea580c'
const RED = '#dc2626'

function rankColor(rank: number, total: number): string {
  if (total === 1) return V
  if (rank === 0) return V
  if (rank === total - 1) return RED
  return OR
}
function rankBg(rank: number, total: number): string {
  return rankColor(rank, total) + '18'
}
function rankValues(values: (number | null)[], higherIsBetter: boolean): number[] {
  const sorted = [...values]
    .filter((v): v is number => v != null)
    .sort((a, b) => higherIsBetter ? b - a : a - b)
  return values.map((v) => {
    if (v == null) return 9999
    return sorted.indexOf(v)
  })
}

interface IndRow {
  label:          string
  fmt:            (v: number | null) => string
  get:            (r: NonNullable<import('@/types/scenario').Scenario['results']>) => number | null
  higherIsBetter: boolean
}

/* ebitdaAcumulado = Σ row.ebitda = Σ (Rec.Bruta − Tributos − OPEX) = Rec. Líquida Acumulada */
const ROWS: IndRow[] = [
  { label: 'VPL',                       fmt: (v) => v != null ? fmtBRL(v, 0) : '—',           get: (r) => r.vpl,               higherIsBetter: true  },
  { label: 'TIR',                       fmt: (v) => v != null ? fmtNum(v, 2) + '%' : '—',     get: (r) => r.tir,               higherIsBetter: true  },
  { label: 'Payback Simples',           fmt: (v) => v != null ? fmtNum(v, 1) + ' anos' : '—', get: (r) => r.paybackSimples,    higherIsBetter: false },
  { label: 'Payback Descontado',        fmt: (v) => v != null ? fmtNum(v, 1) + ' anos' : '—', get: (r) => r.paybackDescontado, higherIsBetter: false },
  { label: 'Receita Líquida Acumulada', fmt: (v) => v != null ? fmtBRL(v, 0) : '—',           get: (r) => r.ebitdaAcumulado,   higherIsBetter: true  },
  { label: 'Receita Bruta Acumulada',   fmt: (v) => v != null ? fmtBRL(v, 0) : '—',           get: (r) => r.receitaAcumulada,  higherIsBetter: true  },
  { label: 'CAPEX',                     fmt: (v) => v != null ? fmtBRL(v, 0) : '—',           get: (r) => r.capex,             higherIsBetter: false },
  { label: 'Geração Anual (MWh)',       fmt: (v) => v != null ? fmtNum(v, 0) + ' MWh' : '—', get: (r) => r.geracaoAnual,      higherIsBetter: true  },
]

function ScenarioBarChart({
  title, data, color, fmtVal
}: {
  title: string
  data: { name: string; value: number | null }[]
  color: string
  fmtVal: (v: number) => string
}) {
  const valid = data.filter((d) => d.value != null)
  if (valid.length === 0) return null
  const maxAbs = Math.max(...valid.map((d) => Math.abs(d.value!)))

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 16px 8px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" hide domain={[-maxAbs * 1.15, maxAbs * 1.15]} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#475569' }} />
          <RTooltip
            formatter={(v: number) => [fmtVal(v), title]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={0.85} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v: number) => fmtVal(v)} style={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ComparativoTab({
  study, studyId,
}: {
  study: Study | null
  studyId: string | undefined
}) {
  const { scenarios, loading } = useScenarios(studyId, study)
  const [exporting, setExporting] = useState(false)

  const withResults = useMemo(
    () => scenarios.filter((s) => s.results != null),
    [scenarios]
  )
  const n = withResults.length

  const ranks = useMemo(() =>
    ROWS.map((row) => {
      const vals = withResults.map((s) => row.get(s.results!))
      return rankValues(vals, row.higherIsBetter)
    }),
    [withResults]
  )

  const handleExportPDF = useCallback(async () => {
    if (!study || withResults.length === 0) return
    setExporting(true)
    try {
      const { exportComparativoPDF } = await import('@/services/comparativoPdfService')
      await exportComparativoPDF(study, withResults)
    } catch (e) {
      console.error('Erro ao exportar PDF:', e)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }, [study, withResults])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>Carregando cenarios...</div>
  }
  if (withResults.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
        <p style={{ fontSize: 14, margin: 0 }}>Nenhum cenario com resultados disponivel.</p>
        <p style={{ fontSize: 12, margin: '6px 0 0' }}>Crie e salve cenarios na aba "Cenarios".</p>
      </div>
    )
  }

  const chartName = (sc: typeof withResults[0]) => sc.name.length > 18 ? sc.name.slice(0, 16) + '…' : sc.name

  const vplData    = withResults.map((s) => ({ name: chartName(s), value: s.results!.vpl }))
  const tirData    = withResults.map((s) => ({ name: chartName(s), value: s.results!.tir }))
  const pbData     = withResults.map((s) => ({ name: chartName(s), value: s.results!.paybackSimples }))
  /* Receita Líquida Acumulada = ebitdaAcumulado (Σ Rec.Bruta − Tributos − OPEX por ano) */
  const recLiqAcumData = withResults.map((s) => ({ name: chartName(s), value: s.results!.ebitdaAcumulado }))
  const recBrutaAcumData = withResults.map((s) => ({ name: chartName(s), value: s.results!.receitaAcumulada }))
  const capexData  = withResults.map((s) => ({ name: chartName(s), value: s.results!.capex }))

  const bestByVPL = [...withResults].sort((a, b) => (b.results!.vpl ?? -Infinity) - (a.results!.vpl ?? -Infinity))[0]
  const bestByTIR = [...withResults].sort((a, b) => (b.results!.tir ?? -Infinity) - (a.results!.tir ?? -Infinity))[0]
  const bestByPB  = [...withResults].filter((s) => s.results!.paybackSimples != null)
                      .sort((a, b) => a.results!.paybackSimples! - b.results!.paybackSimples!)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header com botão exportar ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 8,
            background: exporting ? '#94a3b8' : V,
            color: 'white', border: 'none', cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'background .2s',
          }}
        >
          {exporting
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Gerando PDF...</>
            : <><FileDown size={15} /> Exportar Comparativo PDF</>
          }
        </button>
      </div>

      {/* ── Destaques ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { label: 'Maior VPL',     name: bestByVPL?.name, value: bestByVPL ? fmtBRL(bestByVPL.results!.vpl, 0) : '—' },
          { label: 'Maior TIR',     name: bestByTIR?.name, value: bestByTIR && bestByTIR.results!.tir != null ? fmtNum(bestByTIR.results!.tir, 2) + '%' : '—' },
          { label: 'Menor Payback', name: bestByPB?.name,  value: bestByPB && bestByPB.results!.paybackSimples != null ? fmtNum(bestByPB.results!.paybackSimples, 1) + ' anos' : '—' },
        ].map((d) => (
          <div key={d.label} style={{ background: '#f0fdf4', borderRadius: 10, border: `1px solid ${V}33`, padding: '14px 16px', borderTop: `3px solid ${V}` }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 3px' }}>{d.label}</p>
            <p style={{ fontSize: 17, fontWeight: 900, color: V, margin: '0 0 2px' }}>{d.value}</p>
            {d.name && <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{d.name}</p>}
          </div>
        ))}
      </div>

      {/* ── Tabela comparativa ── */}
      <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1e293b' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'white', fontSize: 11, whiteSpace: 'nowrap', width: 190 }}>
                  Indicador
                </th>
                {withResults.map((sc) => (
                  <th key={sc.id} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'white', fontSize: 11, whiteSpace: 'nowrap', minWidth: 140 }}>
                    {sc.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr key={row.label} style={{ borderBottom: '1px solid #f1f5f9', background: ri % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '9px 14px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {row.label}
                  </td>
                  {withResults.map((sc, si) => {
                    const val  = row.get(sc.results!)
                    const rank = ranks[ri][si]
                    return (
                      <td key={sc.id} style={{
                        padding: '9px 14px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: n > 1 ? rankColor(rank, n) : '#1e293b',
                        background: n > 1 ? rankBg(rank, n) : 'transparent',
                      }}>
                        {row.fmt(val)}
                        {n > 1 && rank === 0 && <span style={{ fontSize: 9, marginLeft: 4 }}>★</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 14px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', fontSize: 10, color: '#94a3b8' }}>
          ★ Melhor cenario &nbsp;|&nbsp; Verde = Melhor &nbsp;|&nbsp; Laranja = Intermediario &nbsp;|&nbsp; Vermelho = Pior
        </div>
      </div>

      {/* ── Graficos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        <ScenarioBarChart title="VPL (R$)"                         data={vplData}          color={V}         fmtVal={(v) => fmtBRL(v, 0)} />
        <ScenarioBarChart title="TIR (%)"                          data={tirData}          color={OR}        fmtVal={(v) => fmtNum(v, 2) + '%'} />
        <ScenarioBarChart title="Payback Simples (anos)"           data={pbData}           color="#8b5cf6"   fmtVal={(v) => fmtNum(v, 1) + ' a'} />
        <ScenarioBarChart title="Receita Líquida Acumulada (R$)"   data={recLiqAcumData}   color={V}         fmtVal={(v) => fmtBRL(v, 0)} />
        <ScenarioBarChart title="Receita Bruta Acumulada (R$)"     data={recBrutaAcumData} color="#3b82f6"   fmtVal={(v) => fmtBRL(v, 0)} />
        <ScenarioBarChart title="CAPEX (R$)"                       data={capexData}        color="#64748b"   fmtVal={(v) => fmtBRL(v, 0)} />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
