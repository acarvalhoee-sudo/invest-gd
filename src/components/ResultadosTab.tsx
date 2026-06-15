/**
 * ResultadosTab.tsx — v5
 *
 * Sub-abas:
 *  · Relatório Executivo — tela premium (RelatorioExecutivoTab)
 *  · Análise Detalhada  — tabela completa + gráfico original
 */
import { useMemo, useState, useCallback } from 'react'
import {
  ComposedChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import {
  ChevronLeft, Save,
  TrendingUp, TrendingDown, Minus,
  BarChart3, FileText,
} from 'lucide-react'

import { calcResultados }    from '@/utils/financialEngine'
import type { Study }        from '@/types/study'
import type { ResultadosFinanceiros } from '@/types/results'
import { fmtBRL, fmtNum, fmtPct }    from '@/utils/formatters'
import { Button }     from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RelatorioExecutivoTab     from '@/components/RelatorioExecutivoTab'

/* ── Cores legado ───────────────────────────────────────────── */
const C_GREEN  = '#16A34A'
const C_GREEN2 = '#86EFAC'
const C_RED    = '#EF4444'

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtM(n: number) {
  const abs = Math.abs(n), neg = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${neg}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `${neg}${(abs / 1_000).toFixed(0)}K`
  return fmtBRL(n, 0)
}

/* ── Tooltip recharts ────────────────────────────────────────── */
function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-xs min-w-[180px]">
      <p className="font-semibold text-foreground mb-1">
        {label === 0 ? 'Ano 0 (CAPEX)' : `Ano ${label}`}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium tabular-nums">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── IndicadorCard ───────────────────────────────────────────── */
function IndicadorCard({
  label, value, sub, size = 'normal', positive,
}: {
  label: string; value: string; sub?: string
  size?: 'normal' | 'large'; positive?: boolean | null
}) {
  const Icon =
    positive === true  ? TrendingUp
    : positive === false ? TrendingDown
    : Minus

  return (
    <div className={[
      'bg-white border border-border rounded-xl p-4 flex flex-col gap-2',
      size === 'large' ? 'ring-2 ring-primary/30 shadow-sm' : '',
    ].join(' ')}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider leading-snug">{label}</p>
        {positive !== undefined && (
          <Icon className={[
            'w-4 h-4 shrink-0',
            positive === true  ? 'text-green-500'
            : positive === false ? 'text-red-500'
            : 'text-slate-400',
          ].join(' ')} />
        )}
      </div>
      <p className={[
        'font-bold tabular-nums leading-none',
        size === 'large' ? 'text-3xl text-primary' : 'text-xl text-foreground',
      ].join(' ')}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

/* ── TabelaFinanceira ────────────────────────────────────────── */
const TABLE_HEADERS = [
  'Ano','Meses','Rec. Bruta','Tributos','Demanda',
  'Operação','Manutenção','Seguro','Gestão','Arrendamento',
  'OPEX','Rec. Líquida','Fl. Acumulado',
]

function TabelaFinanceira({ res }: { res: ResultadosFinanceiros }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-border">
            {TABLE_HEADERS.map((h) => (
              <th key={h} className="px-2 py-2 text-center font-semibold text-muted-foreground border-r border-border last:border-r-0 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {res.tabela.map((row) => {
            const isAno0      = row.ano === 0
            const gestaoTotal = row.opGestao + row.opFixoGestao
            return (
              <tr key={row.ano} className={['border-b border-border last:border-b-0 transition-colors', isAno0 ? 'bg-red-50 font-semibold' : 'hover:bg-slate-50'].join(' ')}>
                <td className="px-2 py-1.5 text-center border-r border-border font-bold whitespace-nowrap">{row.ano}</td>
                <td className="px-2 py-1.5 text-center border-r border-border text-muted-foreground whitespace-nowrap">{isAno0 ? '—' : row.meses}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums whitespace-nowrap">{isAno0 ? '—' : fmtM(row.receitaBruta)}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums text-red-600 whitespace-nowrap">{isAno0 ? '—' : fmtM(row.tributos)}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums text-slate-500 whitespace-nowrap">{isAno0 ? '—' : fmtM(row.opDemanda)}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums text-slate-500 whitespace-nowrap">{isAno0 ? '—' : fmtM(row.opOperacao)}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums text-slate-500 whitespace-nowrap">{isAno0 ? '—' : fmtM(row.opManutencao)}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums text-slate-500 whitespace-nowrap">{isAno0 ? '—' : fmtM(row.opSeguro)}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums text-slate-500 whitespace-nowrap">{isAno0 ? '—' : fmtM(gestaoTotal)}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums text-slate-500 whitespace-nowrap">{isAno0 ? '—' : fmtM(row.opArrendamento)}</td>
                <td className="px-2 py-1.5 text-right border-r border-border tabular-nums font-semibold text-slate-700 whitespace-nowrap">{isAno0 ? '—' : fmtM(row.opexTotal)}</td>
                <td className={['px-2 py-1.5 text-right border-r border-border tabular-nums font-semibold whitespace-nowrap', isAno0 ? '' : row.ebitda >= 0 ? 'text-green-700' : 'text-red-600'].join(' ')}>
                  {isAno0 ? '—' : fmtM(row.ebitda)}
                </td>
                <td className={['px-2 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap', row.fluxoAcumulado >= 0 ? 'text-green-700' : 'text-red-600'].join(' ')}>
                  {fmtM(row.fluxoAcumulado)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Gráfico Fluxo Acumulado ─────────────────────────────────── */
const AXIS_STYLE = { fontSize: 11, fill: '#94A3B8' }
const GRID_PROPS = { stroke: '#E2E8F0', strokeDasharray: '3 3' }

function GraficoFluxoAcumulado({ res }: { res: ResultadosFinanceiros }) {
  const dados = res.tabela.map((r) => ({ ano: r.ano, 'Fluxo Acumulado': r.fluxoAcumulado }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Fluxo de Caixa Acumulado</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={dados} margin={{ top: 12, right: 24, left: 8, bottom: 16 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="ano" tick={AXIS_STYLE} label={{ value: 'Ano', position: 'insideBottom', offset: -8, fontSize: 11, fill: '#64748B' }} />
            <YAxis tickFormatter={fmtM} tick={AXIS_STYLE} width={76} />
            <RTooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={C_RED} strokeWidth={1.5} strokeDasharray="6 3" label={{ value: 'Payback', position: 'insideTopLeft', fontSize: 10, fill: C_RED }} />
            <Area type="monotone" dataKey="Fluxo Acumulado" stroke={C_GREEN} strokeWidth={2.5} fill={C_GREEN2} fillOpacity={0.3} dot={{ r: 3, fill: C_GREEN, strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>

        {(res.paybackSimples != null || res.paybackDescontado != null) && (
          <div className="flex flex-wrap gap-6 justify-center mt-3 text-xs text-muted-foreground">
            {res.paybackSimples != null && (
              <span>Payback Simples:{' '}<span className="font-semibold text-foreground">{fmtNum(res.paybackSimples, 1)} anos</span></span>
            )}
            {res.paybackDescontado != null && (
              <span>Payback Descontado:{' '}<span className="font-semibold text-foreground">{fmtNum(res.paybackDescontado, 1)} anos</span></span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════ */
interface Props {
  study: Study
  saving: boolean
  onSave: () => void
  onBack: () => void
  isNew: boolean
}

export default function ResultadosTab({ study, saving, onSave, onBack, isNew }: Props) {
  const res: ResultadosFinanceiros = useMemo(() => calcResultados(study), [study])

  const tir = res.tir
  const vpl = res.vpl
  const tma = study.premissasFinanceiras.tma

  const tirStr = tir != null ? `${fmtNum(tir, 2)}% a.a.` : '—'
  const pbSimp = res.paybackSimples    != null ? `${fmtNum(res.paybackSimples, 1)} anos`    : 'Não atingido'
  const pbDesc = res.paybackDescontado != null ? `${fmtNum(res.paybackDescontado, 1)} anos` : 'Não atingido'

  const [viewMode, setViewMode]     = useState<'relatorio' | 'detalhe'>('relatorio')


  return (
    <div className="space-y-5">

      {/* ── Barra superior: sub-abas + botão PDF ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tab pills */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('relatorio')}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewMode === 'relatorio'
                ? 'bg-white text-[#0B5E3B] shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <FileText className="w-4 h-4" />
            Relatório Executivo
          </button>
          <button
            onClick={() => setViewMode('detalhe')}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewMode === 'detalhe'
                ? 'bg-white text-gray-800 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <BarChart3 className="w-4 h-4" />
            Análise Detalhada
          </button>
        </div>

      </div>

      {/* ══ RELATÓRIO EXECUTIVO ══════════════════════════════════ */}
      {viewMode === 'relatorio' && (
        <>
          <RelatorioExecutivoTab study={study} res={res} />

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <Button
              onClick={onSave} disabled={saving} size="lg"
              className="bg-[#0B5E3B] hover:bg-[#094d30] text-white gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : isNew ? 'Criar Estudo' : 'Salvar Alterações'}
            </Button>
          </div>
        </>
      )}

      {/* ══ ANÁLISE DETALHADA (conteúdo original) ══════════════ */}
      {viewMode === 'detalhe' && (
        <div className="space-y-10">

          {/* Cards de indicadores */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Indicadores de Viabilidade
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <IndicadorCard
                label="VPL — Valor Presente Líquido"
                value={fmtBRL(vpl, 0)}
                sub={`TMA de ${fmtPct(tma, 2)}`}
                size="large"
                positive={vpl > 0 ? true : vpl < 0 ? false : null}
              />
              <IndicadorCard
                label="TIR — Taxa Interna de Retorno"
                value={tirStr}
                sub={tir != null ? (tir > tma ? `Acima da TMA (${fmtPct(tma, 2)})` : `Abaixo da TMA (${fmtPct(tma, 2)})`) : undefined}
                size="large"
                positive={tir != null ? (tir > tma ? true : false) : null}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <IndicadorCard label="Geração Média Mensal"  value={`${fmtNum(res.geracaoMediaMensal, 1)} MWh`}  sub={`${fmtNum(res.geracaoMediaMensal * 12, 0)} MWh/ano`} />
              <IndicadorCard label="Receita Bruta — Ano 1" value={fmtBRL(res.receitaAnual, 0)}   sub="Primeiro ano de operação" />
              <IndicadorCard label="Receita Líquida — Ano 1" value={fmtBRL(res.ebitdaAnual, 0)}   sub="Rec. Bruta − Tributos − OPEX" positive={res.ebitdaAnual > 0 ? true : false} />
              <IndicadorCard label="CAPEX Total"           value={fmtBRL(res.capex, 0)}          sub="Investimento inicial" />
              <IndicadorCard label="Payback Simples"       value={pbSimp} />
              <IndicadorCard label="Payback Descontado"    value={pbDesc} />
            </div>
          </section>

          {/* Gráfico */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Análise Gráfica
            </h2>
            <GraficoFluxoAcumulado res={res} />
          </section>

          {/* Tabela */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Tabela Financeira Anual
            </h2>
            <TabelaFinanceira res={res} />
            <p className="text-xs text-muted-foreground mt-2">
              * K = mil · M = milhão. Calculado em: {new Date(res.calculadoEm).toLocaleString('pt-BR')}.
            </p>
          </section>

          {/* Ações */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <Button onClick={onSave} disabled={saving} size="lg" className="bg-[#0B5E3B] hover:bg-[#094d30] text-white gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : isNew ? 'Criar Estudo' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
