/**
 * ResultsPage.tsx
 * Página de resultados com cards executivos, tabela de fluxo de caixa e gráficos
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend,
  ComposedChart, Area, ReferenceLine, PieChart, Pie, Cell
} from 'recharts'
import { ArrowLeft, FileDown, Edit, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { buscarEstudo } from '../services/firestoreService'
import { calcularViabilidade, formatBRL, formatPct, formatPayback, formatMWh } from '../calculations/viabilityEngine'
import { gerarPDF } from '../reports/pdfGenerator'
import type { Estudo, ResultadosEstudo } from '../types/studyTypes'
import { FONTE_LABELS } from '../types/studyTypes'

// ─── Formatação de eixo ───────────────────────

function fmtEixoBRL(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$${(v/1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)    return `R$${(v/1_000).toFixed(0)}K`
  return `R$${v.toFixed(0)}`
}

function fmtEixoPct(v: number) { return `${v.toFixed(1)}%` }

// ─── Tooltip personalizado ────────────────────

function CustomTooltip({ active, payload, label, formato = 'brl' }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number; formato?: 'brl' | 'pct' | 'mwh'
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium">
            {formato === 'brl'  ? formatBRL(p.value, 0) :
             formato === 'pct'  ? formatPct(p.value) :
                                  formatMWh(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Card de Indicador ────────────────────────

function IndicatorCard({
  label, value, sub, highlight = false, trend
}: { label: string; value: string; sub?: string; highlight?: boolean; trend?: 'up' | 'down' | null }) {
  return (
    <div className={`metric-card ${highlight ? 'ring-2 ring-primary-400 bg-primary-50' : ''}`}>
      <p className="metric-label">{label}</p>
      <div className="flex items-end gap-1">
        <p className={`${highlight ? 'text-3xl' : 'metric-value'} ${trend === 'up' ? 'metric-positive' : trend === 'down' ? 'metric-negative' : ''}`}>
          {value}
        </p>
        {trend === 'up'   && <TrendingUp   className="w-5 h-5 text-success-500 mb-1" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-danger-500 mb-1" />}
      </div>
      {sub && <p className="metric-sub">{sub}</p>}
    </div>
  )
}

// ─── Componente Principal ─────────────────────

export default function ResultsPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const [estudo,   setEstudo]  = useState<Estudo | null>(null)
  const [result,   setResult]  = useState<ResultadosEstudo | null>(null)
  const [loading,  setLoading] = useState(true)
  const graficosRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    buscarEstudo(id).then((e) => {
      if (e) {
        setEstudo(e)
        const r = e.resultados ?? calcularViabilidade(e.dadosUsina, e.premissas, e.parametros)
        setResult(r)
      }
      setLoading(false)
    })
  }, [id])

  async function handlePDF() {
    if (!estudo || !result) return
    try {
      await gerarPDF(estudo, result)
    } catch {
      toast.error('Erro ao gerar PDF.')
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p>Calculando viabilidade…</p>
      </div>
    </div>
  )

  if (!estudo || !result) return (
    <div className="p-6 text-center text-gray-500">Estudo não encontrado.</div>
  )

  const { indicadores, fluxoCaixa } = result
  const { dadosUsina, premissas }   = estudo
  const isViavel  = indicadores.viabilidade === 'VIÁVEL'
  const fluxoOper = fluxoCaixa.slice(1) // sem ano 0

  // ─── Dados para gráficos ───

  const dadosFluxo = fluxoOper.map((l) => ({
    ano: l.ano.toString(),
    Receita: l.receita,
    'Total Custos': l.totalSaidas,
    'Fluxo de Caixa': l.fluxoCaixa,
  }))

  const dadosAcumulado = fluxoCaixa.map((l) => ({
    ano: l.ano === estudo.parametros.anoInicial - 1 ? 'Inv.' : l.ano.toString(),
    'Fluxo Acumulado': l.fluxoAcumulado,
    'Fluxo Desc. Acumulado': l.fluxoDescontadoAcumulado,
  }))

  const dadosRentabilidade = fluxoOper.map((l) => ({
    ano: l.ano.toString(),
    'Rentabilidade (%)': l.rentabilidade,
    [`SELIC ${premissas.financeiras.selic}%`]: premissas.financeiras.selic,
    [`TMA ${premissas.financeiras.tma}%`]: premissas.financeiras.tma,
  }))

  const dadosComposicaoCustos = fluxoOper.length > 0 ? [
    { name: 'Manutenção', value: fluxoOper.reduce((s, l) => s + l.manutencao, 0) },
    { name: 'Gestão Variável', value: fluxoOper.reduce((s, l) => s + l.gestaoVariavel, 0) },
    { name: 'Gestão Fixa', value: fluxoOper.reduce((s, l) => s + l.gestaoFixa, 0) },
    { name: 'Demanda', value: fluxoOper.reduce((s, l) => s + l.demanda, 0) },
    { name: 'Impostos', value: fluxoOper.reduce((s, l) => s + l.impostos, 0) },
  ].filter((d) => d.value > 0) : []

  const CORES_PIZZA = ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444']

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dadosUsina.nomeEstudo}</h1>
            <p className="text-gray-500 text-sm">
              {dadosUsina.nomeUsina} · {FONTE_LABELS[dadosUsina.fonte]} · {dadosUsina.potencia.toLocaleString('pt-BR')} {dadosUsina.fonte === 'solar' ? 'kWp' : 'kW'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => navigate(`/estudo/${id}/editar`)}>
            <Edit className="w-4 h-4" /> Editar
          </button>
          <button className="btn-success" onClick={handlePDF}>
            <FileDown className="w-4 h-4" /> Gerar PDF
          </button>
        </div>
      </div>

      {/* Banner de viabilidade */}
      <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${isViavel ? 'bg-success-50 border-2 border-success-200' : 'bg-danger-50 border-2 border-danger-200'}`}>
        {isViavel
          ? <CheckCircle className="w-10 h-10 text-success-600 shrink-0" />
          : <XCircle    className="w-10 h-10 text-danger-600 shrink-0" />
        }
        <div>
          <p className={`text-2xl font-extrabold tracking-wide ${isViavel ? 'text-success-700' : 'text-danger-700'}`}>
            {indicadores.viabilidade}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {isViavel
              ? `VPL positivo e TIR (${formatPct(indicadores.tir)}) acima da TMA (${formatPct(premissas.financeiras.tma)})`
              : `VPL negativo ou TIR (${formatPct(indicadores.tir)}) abaixo da TMA (${formatPct(premissas.financeiras.tma)})`
            }
          </p>
        </div>
      </div>

      {/* Cards executivos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <IndicatorCard label="Investimento Total" value={formatBRL(indicadores.investimentoTotal, 0)} />
        <IndicatorCard label="Potência" value={`${dadosUsina.potencia.toLocaleString('pt-BR')} ${dadosUsina.fonte === 'solar' ? 'kWp' : 'kW'}`} />
        <IndicatorCard label="Produção Anual Média" value={formatMWh(indicadores.producaoAnualMedia)} />
        <IndicatorCard label="Receita Média Anual" value={formatBRL(indicadores.receitaMedia, 0)} />
        <IndicatorCard label="Fluxo Médio Anual" value={formatBRL(indicadores.fluxoMedio, 0)}
          trend={indicadores.fluxoMedio >= 0 ? 'up' : 'down'} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <IndicatorCard label="VPL" value={formatBRL(indicadores.vpl, 0)} highlight
          trend={indicadores.vpl >= 0 ? 'up' : 'down'} />
        <IndicatorCard label="TIR" value={formatPct(indicadores.tir)} highlight
          trend={indicadores.tir >= premissas.financeiras.tma ? 'up' : 'down'}
          sub={`TMA: ${formatPct(premissas.financeiras.tma)}`} />
        <IndicatorCard label="Payback Simples" value={formatPayback(indicadores.paybackSimples)} />
        <IndicatorCard label="Payback Descontado" value={formatPayback(indicadores.paybackDescontado)} />
        <div className="grid grid-rows-2 gap-4">
          <div className="metric-card py-3">
            <p className="metric-label">SELIC</p>
            <p className="text-lg font-bold text-gray-900">{formatPct(premissas.financeiras.selic)}</p>
          </div>
          <div className="metric-card py-3">
            <p className="metric-label">TMA</p>
            <p className="text-lg font-bold text-gray-900">{formatPct(premissas.financeiras.tma)}</p>
          </div>
        </div>
      </div>

      {/* ─── Gráficos ─── */}
      <div ref={graficosRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* 1. Fluxo de Caixa Anual */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-700">Fluxo de Caixa Anual</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={dadosFluxo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtEixoBRL} tick={{ fontSize: 10 }} />
                <RechartTooltip content={<CustomTooltip formato="brl" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receita" fill="#10b981" radius={[2,2,0,0]} />
                <Bar dataKey="Total Custos" fill="#ef4444" radius={[2,2,0,0]} />
                <Line type="monotone" dataKey="Fluxo de Caixa" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Fluxo Acumulado */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-700">Fluxo de Caixa Acumulado</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={dadosAcumulado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtEixoBRL} tick={{ fontSize: 10 }} />
                <RechartTooltip content={<CustomTooltip formato="brl" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="Fluxo Acumulado" stroke="#0ea5e9" fill="#bae6fd" strokeWidth={2} />
                <Line type="monotone" dataKey="Fluxo Desc. Acumulado" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Rentabilidade x SELIC x TMA */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-700">Rentabilidade Anual vs. SELIC e TMA</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={dadosRentabilidade}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtEixoPct} tick={{ fontSize: 10 }} />
                <RechartTooltip content={<CustomTooltip formato="pct" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Rentabilidade (%)" fill="#10b981" radius={[2,2,0,0]} />
                <Line type="monotone" dataKey={`SELIC ${premissas.financeiras.selic}%`} stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                <Line type="monotone" dataKey={`TMA ${premissas.financeiras.tma}%`} stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Composição dos Custos */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-700">Composição dos Custos (Total do Período)</h3></div>
          <div className="card-body flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dadosComposicaoCustos} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={true}>
                  {dadosComposicaoCustos.map((_, i) => (
                    <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                  ))}
                </Pie>
                <RechartTooltip formatter={(v: number) => formatBRL(v, 0)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Payback visual */}
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-700">Evolução do Fluxo Descontado Acumulado (Payback)</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={dadosAcumulado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtEixoBRL} tick={{ fontSize: 10 }} />
                <RechartTooltip content={<CustomTooltip formato="brl" />} />
                <ReferenceLine y={0} stroke="#0ea5e9" strokeWidth={2} label={{ value: 'Payback', position: 'insideTopLeft', fontSize: 11, fill: '#0ea5e9' }} />
                <Area type="monotone" dataKey="Fluxo Desc. Acumulado" stroke="#6366f1" fill="#ede9fe" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Tabela de Fluxo de Caixa ─── */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-700">Tabela de Fluxo de Caixa Detalhado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-50 z-10">Ano</th>
                <th>Meses</th>
                <th>Produção (MWh)</th>
                <th>Receita</th>
                <th>Manutenção</th>
                <th>Gest. Variável</th>
                <th>Gest. Fixa</th>
                <th>Demanda</th>
                <th>Impostos</th>
                <th>Total Saídas</th>
                <th>Fluxo de Caixa</th>
                <th>FC Acumulado</th>
                <th>FC Descontado</th>
                <th>FC Desc. Acum.</th>
                <th>Rentab. %</th>
              </tr>
            </thead>
            <tbody>
              {fluxoCaixa.map((linha, idx) => {
                const isAno0  = idx === 0
                const isPos   = linha.fluxoCaixa >= 0
                return (
                  <tr key={linha.ano} className={isAno0 ? 'bg-gray-50 font-semibold' : ''}>
                    <td className="sticky left-0 bg-white z-10 font-semibold">
                      {isAno0 ? 'Ano 0' : linha.ano}
                    </td>
                    <td>{isAno0 ? '—' : linha.meses}</td>
                    <td>{isAno0 ? '—' : linha.producao.toFixed(1)}</td>
                    <td>{isAno0 ? '—' : formatBRL(linha.receita, 0)}</td>
                    <td>{isAno0 ? '—' : formatBRL(linha.manutencao, 0)}</td>
                    <td>{isAno0 ? '—' : formatBRL(linha.gestaoVariavel, 0)}</td>
                    <td>{isAno0 ? '—' : formatBRL(linha.gestaoFixa, 0)}</td>
                    <td>{isAno0 ? '—' : formatBRL(linha.demanda, 0)}</td>
                    <td>{isAno0 ? '—' : formatBRL(linha.impostos, 0)}</td>
                    <td className="text-danger-600">{isAno0 ? '—' : formatBRL(linha.totalSaidas, 0)}</td>
                    <td className={isAno0 ? 'text-danger-700' : isPos ? 'text-success-600 font-semibold' : 'text-danger-600 font-semibold'}>
                      {formatBRL(linha.fluxoCaixa, 0)}
                    </td>
                    <td className={linha.fluxoAcumulado >= 0 ? 'text-success-600' : 'text-danger-600'}>
                      {formatBRL(linha.fluxoAcumulado, 0)}
                    </td>
                    <td>{isAno0 ? formatBRL(linha.fluxoDescontado, 0) : formatBRL(linha.fluxoDescontado, 0)}</td>
                    <td className={linha.fluxoDescontadoAcumulado >= 0 ? 'text-success-600' : 'text-danger-600'}>
                      {formatBRL(linha.fluxoDescontadoAcumulado, 0)}
                    </td>
                    <td>{isAno0 ? '—' : formatPct(linha.rentabilidade)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
