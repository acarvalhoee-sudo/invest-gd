/**
 * SensibilidadeTab.tsx — Analise de Sensibilidade (FASE 04)
 * Graficos: Tarifa x TIR, CAPEX x TIR, FatorCapacidade x VPL
 * Heatmap SVG: Tarifa x CAPEX -> VPL
 */
import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { Study }     from '@/types/study'
import { calcResultados } from '@/utils/financialEngine'
import { fmtBRL, fmtNum } from '@/utils/formatters'

const V   = '#0B5E3B'
const OR  = '#ea580c'

/* ── helper: run engine with one param overridden ── */
function runWith(base: Study, patch: Partial<Study['tarifas'] & Study['capex'] & Study['ativo'] & Study['premissasFinanceiras']>, mode: 'tarifa' | 'capex' | 'fc') {
  let s = { ...base }
  if (mode === 'tarifa' && 'tarifaVenda' in patch) {
    s = { ...s, tarifas: { ...s.tarifas, tarifaVenda: (patch as { tarifaVenda: number }).tarifaVenda } }
  } else if (mode === 'capex' && 'total' in patch) {
    s = { ...s, capex: { ...s.capex, total: (patch as { total: number }).total } }
  } else if (mode === 'fc' && 'fatorCapacidade' in patch) {
    s = { ...s, ativo: { ...s.ativo, fatorCapacidade: (patch as { fatorCapacidade: number }).fatorCapacidade } }
  }
  const r = calcResultados(s)
  return r
}

/* ── Sensitivity line chart ── */
function SensLine({
  title, data, xLabel, yLabel, yFmt, color, refX
}: {
  title:  string
  data:   { x: number; y: number | null }[]
  xLabel: string
  yLabel: string
  yFmt:   (v: number) => string
  color:  string
  refX?:  number
}) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 16px 8px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: 10, right: 10, top: 4, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']}
            label={{ value: xLabel, position: 'insideBottom', offset: -10, fontSize: 10, fill: '#64748b' }}
            tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v, 0)} />
          <YAxis
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b', dx: -5 }}
            tick={{ fontSize: 10 }} tickFormatter={yFmt} />
          <RTooltip
            formatter={(v: number) => [yFmt(v), yLabel]}
            labelFormatter={(x) => xLabel + ': ' + fmtNum(x, 0)}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          {refX != null && (
            <ReferenceLine x={refX} stroke={OR} strokeDasharray="5 3" label={{ value: 'Base', position: 'top', fontSize: 10, fill: OR }} />
          )}
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Heatmap SVG ── */
function Heatmap({
  rowValues, colValues,
  rowLabel, colLabel,
  matrix, fmtCell
}: {
  rowValues: number[]; colValues: number[]
  rowLabel: string; colLabel: string
  matrix: (number | null)[][]
  fmtCell: (v: number | null) => string
}) {
  /* Compute min/max for coloring */
  const flat = matrix.flat().filter((v): v is number => v != null)
  const vMin = Math.min(...flat)
  const vMax = Math.max(...flat)

  function cellColor(v: number | null): string {
    if (v == null) return '#e2e8f0'
    if (vMax === vMin) return '#f0fdf4'
    const t = (v - vMin) / (vMax - vMin)  // 0..1 where 1 is best (highest VPL)
    if (t < 0.25) return '#fee2e2'   // red
    if (t < 0.5)  return '#fef9c3'   // yellow
    if (t < 0.75) return '#dcfce7'   // light green
    return '#86efac'                   // green
  }

  function textColor(v: number | null): string {
    if (v == null) return '#94a3b8'
    const t = vMax === vMin ? 0.5 : (v - vMin) / (vMax - vMin)
    return t < 0.25 ? '#991b1b' : t >= 0.75 ? '#14532d' : '#713f12'
  }

  const cellW = 90
  const cellH = 36
  const labelW = 80
  const headerH = 40
  const totalW  = labelW + colValues.length * cellW + 4
  const totalH  = headerH + rowValues.length * cellH + 4

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,.04)', overflowX: 'auto' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Heatmap: {rowLabel} &times; {colLabel} &rarr; VPL
      </p>
      <svg width={totalW} height={totalH} style={{ display: 'block', fontSize: 10 }}>
        {/* Col header */}
        {colValues.map((cv, ci) => (
          <text key={ci} x={labelW + ci * cellW + cellW / 2} y={headerH - 6}
            textAnchor="middle" fill="#475569" fontWeight={600} fontSize={10}>
            {colLabel === 'CAPEX' ? 'R$' + fmtNum(cv / 1e6, 1) + 'M' : fmtNum(cv, 0)}
          </text>
        ))}
        {/* Row header label */}
        <text x={0} y={headerH / 2 + 5} fill="#94a3b8" fontSize={9}>{rowLabel}</text>
        {/* Col header label */}
        <text x={labelW + (colValues.length * cellW) / 2} y={12}
          textAnchor="middle" fill="#94a3b8" fontSize={9}>{colLabel}</text>

        {/* Cells */}
        {rowValues.map((rv, ri) => (
          <g key={ri}>
            {/* Row label */}
            <text x={labelW - 6} y={headerH + ri * cellH + cellH / 2 + 4}
              textAnchor="end" fill="#475569" fontWeight={600} fontSize={10}>
              {fmtNum(rv, 0)}
            </text>
            {colValues.map((_, ci) => {
              const val = matrix[ri][ci]
              return (
                <g key={ci}>
                  <rect
                    x={labelW + ci * cellW + 2}
                    y={headerH + ri * cellH + 2}
                    width={cellW - 4} height={cellH - 4}
                    rx={5} fill={cellColor(val)}
                  />
                  <text
                    x={labelW + ci * cellW + cellW / 2}
                    y={headerH + ri * cellH + cellH / 2 + 4}
                    textAnchor="middle" fontSize={9} fontWeight={700}
                    fill={textColor(val)}>
                    {fmtCell(val)}
                  </text>
                </g>
              )
            })}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 10, color: '#64748b', alignItems: 'center' }}>
        <span>Escala VPL:</span>
        {[['#fee2e2','Ruim'], ['#fef9c3','Medio'], ['#dcfce7','Bom'], ['#86efac','Excelente']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block', border: '1px solid #e2e8f0' }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────── */
export default function SensibilidadeTab({ study }: { study: Study | null }) {

  const [steps] = useState(7)

  const data = useMemo(() => {
    if (!study) return null

    const base  = study.tarifas.tarifaVenda
    const baseC = study.capex.total
    const baseF = study.ativo.fatorCapacidade

    /* Tarifa range: base ± 30% */
    const tarifas = Array.from({ length: steps }, (_, i) => base * (0.7 + i * 0.1))
    const tirByTarifa = tarifas.map((t) => {
      const r = runWith({ ...study, tarifas: { ...study.tarifas, tarifaVenda: t } }, { tarifaVenda: t }, 'tarifa')
      return { x: t, y: r.tir }
    })

    /* CAPEX range: base ± 20% */
    const capexVals = [-20, -10, 0, 10, 20].map((p) => baseC * (1 + p / 100))
    const tirByCapex = capexVals.map((c, i) => {
      const r = runWith({ ...study, capex: { ...study.capex, total: c } }, { total: c }, 'capex')
      return { x: -20 + i * 10, y: r.tir, capex: c }
    })

    /* Fator de Capacidade range */
    const fcVals = [baseF - 8, baseF - 4, baseF, baseF + 4, baseF + 8].filter((v) => v > 0 && v <= 100)
    const vplByFc = fcVals.map((fc) => {
      const r = runWith({ ...study, ativo: { ...study.ativo, fatorCapacidade: fc } }, { fatorCapacidade: fc }, 'fc')
      return { x: fc, y: r.vpl }
    })

    /* Heatmap: 5 tarifas x 5 capexs */
    const hTarifas = [-15, -7.5, 0, 7.5, 15].map((p) => base * (1 + p / 100))
    const hCapexs  = [-20, -10, 0, 10, 20].map((p) => baseC * (1 + p / 100))
    const matrix: (number | null)[][] = hTarifas.map((t) =>
      hCapexs.map((c) => {
        try {
          const s = { ...study, tarifas: { ...study.tarifas, tarifaVenda: t }, capex: { ...study.capex, total: c } }
          return calcResultados(s).vpl
        } catch { return null }
      })
    )

    return { tirByTarifa, tirByCapex, vplByFc, hTarifas, hCapexs, matrix, base, baseC, baseF }
  }, [study, steps])

  if (!study) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>Carregando dados do estudo...</div>
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>Erro ao calcular sensibilidade.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Cabecalho */}
      <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Analise de Sensibilidade</p>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
          Impacto das variacoes de tarifa, CAPEX e fator de capacidade nos indicadores de retorno.
          Valores base: Tarifa {fmtNum(data.base, 0)} R$/MWh &bull; CAPEX {fmtBRL(data.baseC, 0)} &bull; FC {fmtNum(data.baseF, 1)}%
        </p>
      </div>

      {/* Graficos 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SensLine
          title="Tarifa de Venda x TIR"
          data={data.tirByTarifa}
          xLabel="Tarifa (R$/MWh)"
          yLabel="TIR (%)"
          yFmt={(v) => fmtNum(v, 1) + '%'}
          color={V}
          refX={data.base}
        />
        <SensLine
          title="Variacao CAPEX x TIR"
          data={data.tirByCapex.map((d) => ({ x: d.x, y: d.y }))}
          xLabel="Variacao CAPEX (%)"
          yLabel="TIR (%)"
          yFmt={(v) => fmtNum(v, 1) + '%'}
          color={OR}
          refX={0}
        />
        <SensLine
          title="Fator de Capacidade x VPL"
          data={data.vplByFc}
          xLabel="Fator Capacidade (%)"
          yLabel="VPL (R$)"
          yFmt={(v) => fmtBRL(v, 0)}
          color="#8b5cf6"
          refX={data.baseF}
        />
        {/* Quarto quadrante: resumo textual */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Interpretacao</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '📈', txt: 'Tarifa +10% eleva a TIR significativamente. Renegociacao de contrato e alavancagem direta.' },
              { icon: '🏗️', txt: 'Reducao de CAPEX melhora o retorno. Busque eficiencia na engenharia e fornecedores.' },
              { icon: '☀️', txt: 'Fator de capacidade e critico. Validar os dados de irradiacao antes de fechar o negocio.' },
            ].map((item) => (
              <div key={item.icon} style={{ display: 'flex', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.5 }}>{item.txt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <Heatmap
        rowValues={data.hTarifas}
        colValues={data.hCapexs}
        rowLabel="Tarifa (R$/MWh)"
        colLabel="CAPEX"
        matrix={data.matrix}
        fmtCell={(v) => v != null ? fmtBRL(v, 0) : '—'}
      />
    </div>
  )
}
