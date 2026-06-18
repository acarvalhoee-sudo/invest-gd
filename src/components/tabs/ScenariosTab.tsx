/**
 * ScenariosTab.tsx — Gestao de cenarios de um estudo (FASE 04)
 * Lista / cria / edita / duplica / exclui cenarios.
 * Parametros editaveis e resultados calculados em tempo real.
 */
import { useEffect, useMemo, useState } from 'react'
import { Copy, Plus, Trash2, Zap, CheckCircle2, AlertCircle, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MoneyInput } from '@/components/ui/money-input'
import type { Study, FonteGeracao, TipoGD }  from '@/types/study'
import { FONTE_LABELS } from '@/types/study'
import type { Scenario, ScenarioParams } from '@/types/scenario'
import { paramsFromStudy } from '@/types/scenario'
import { useScenarios } from '@/hooks/useScenarios'
import { fmtBRL, fmtNum } from '@/utils/formatters'

const V  = '#0B5E3B'
const OR = '#ea580c'

/* ── helpers ── */
function pct(v: number | null | undefined) {
  if (v == null) return '—'
  return fmtNum(v, 2) + '%'
}
function money(v: number | null | undefined) {
  if (v == null) return '—'
  return fmtBRL(v, 0)
}

/* ── Mini KPI chip ── */
function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 90, textAlign: 'center', padding: '8px 6px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: 0.6 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 800, color: color ?? '#1e293b', margin: 0 }}>{value}</p>
    </div>
  )
}

/* ── Scenario Card ── */
function ScenarioCard({
  sc, selected, onSelect, onDuplicate, onDelete
}: {
  sc: Scenario; selected: boolean
  onSelect: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const r = sc.results
  const tir = r?.tir != null ? r.tir : null
  const vpl = r?.vpl ?? null
  const pb  = r?.paybackSimples ?? null

  return (
    <div
      onClick={onSelect}
      style={{
        borderRadius: 10,
        border: `2px solid ${selected ? V : '#e2e8f0'}`,
        padding: '12px 14px',
        background: selected ? '#f0fdf4' : 'white',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        boxShadow: selected ? '0 0 0 3px ' + V + '22' : '0 1px 3px rgba(0,0,0,.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {selected && <CheckCircle2 style={{ width: 15, height: 15, color: V, flexShrink: 0 }} />}
        <p style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sc.name}
        </p>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#94a3b8' }} title="Duplicar">
          <Copy style={{ width: 13, height: 13 }} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#fca5a5' }} title="Excluir">
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <Kpi label="TIR" value={pct(tir)} color={tir != null && tir > 0 ? '#15803d' : '#dc2626'} />
        <Kpi label="VPL" value={money(vpl)} color={vpl != null && vpl >= 0 ? '#15803d' : '#dc2626'} />
        <Kpi label="Payback" value={pb != null ? fmtNum(pb, 1) + ' a' : '—'} />
      </div>
    </div>
  )
}

/* ── Numeric field (simpler than MoneyInput for %) ── */
function NumField({ label, value, onChange, suffix = '', hint = '' }: {
  label: string; value: number; onChange: (v: number) => void
  suffix?: string; hint?: string
}) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
        {label} {suffix && <span style={{ color: '#94a3b8' }}>({suffix})</span>}
      </label>
      <input
        type="number"
        value={value}
        step="any"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        onFocus={(e) => (e.target.style.borderColor = V)}
        onBlur={(e)  => (e.target.style.borderColor = '#e2e8f0')}
      />
      {hint && <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>{hint}</p>}
    </div>
  )
}

/* ── Section wrapper ── */
function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [isOpen, setIsOpen] = useState(open)
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#1e293b', textAlign: 'left' }}
      >
        {title}
        {isOpen ? <ChevronUp style={{ width: 14, height: 14, color: '#94a3b8' }} /> : <ChevronDown style={{ width: 14, height: 14, color: '#94a3b8' }} />}
      </button>
      {isOpen && <div style={{ padding: '12px 14px' }}>{children}</div>}
    </div>
  )
}

/* ── Opções para selects ── */
const FONTE_OPTIONS: { value: FonteGeracao; label: string }[] = [
  { value: 'cgh',      label: 'CGH' },
  { value: 'pch',      label: 'PCH' },
  { value: 'ufv',      label: 'UFV' },
  { value: 'solar',    label: 'Solar' },
  { value: 'eolica',   label: 'Eólica' },
  { value: 'biomassa', label: 'Biomassa' },
  { value: 'biogas',   label: 'Biogás' },
  { value: 'outros',   label: 'Outros' },
]
const TIPOGD_OPTIONS: TipoGD[] = ['GD I', 'GD II', 'GD III']

/* ── Default params from study ── */
const DEFAULT_PARAMS: ScenarioParams = {
  // Dados técnicos
  potencia: 500, demanda: 500, fatorCapacidade: 55,
  consumoAnualUG: 0, fonte: 'cgh', tipoGD: 'GD II',
  // Tarifas
  tarifaVenda: 500, tusdG: 15, reajusteAnual: 5,
  // CAPEX
  capexTotal: 5000000,
  // OPEX
  opexOperacao: 1, opexManutencao: 1, opexSeguro: 0.5, opexGestao: 2, opexArrendamento: 0, opexFixoGestao: 0,
  // Tributos
  tributosReceita: 0, pis: 1.65, cofins: 7.6, icms: 0,
  // Premissas
  tma: 10, selic: 10.75, ipca: 4.5, vidaUtil: 20,
}

/* ─────────────────────────────────────────────
   MAIN TAB
───────────────────────────────────────────── */
export default function ScenariosTab({
  study, studyId,
}: {
  study: Study | null
  studyId: string | undefined
}) {
  const { scenarios, loading, error, reload, add, update, remove, duplicate, calcScenarioResults } = useScenarios(studyId, study)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editName,   setEditName]   = useState('')
  const [params,     setParams]     = useState<ScenarioParams>(DEFAULT_PARAMS)
  const [saving,     setSaving]     = useState(false)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)

  /* Quando lista carrega, selecionar o primeiro */
  useEffect(() => {
    if (!selectedId && scenarios.length > 0) {
      loadScenario(scenarios[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios.length])

  function loadScenario(sc: Scenario) {
    setSelectedId(sc.id ?? null)
    setEditName(sc.name)
    setParams({ ...sc.params })
  }

  function setP<K extends keyof ScenarioParams>(k: K, v: ScenarioParams[K]) {
    setParams((prev) => ({ ...prev, [k]: v }))
  }

  /* Geração calculada automaticamente a partir dos dados técnicos do cenário */
  const geracaoMensal = useMemo(
    () => params.potencia * (params.fatorCapacidade / 100) * 730 / 1000,
    [params.potencia, params.fatorCapacidade]
  )
  const geracaoAnual = geracaoMensal * 12

  /* Preview live dos resultados */
  const preview = useMemo(() => {
    if (!study) return null
    return calcScenarioResults(params)
  }, [params, study, calcScenarioResults])

  async function handleSave() {
    if (!studyId) return
    setSaving(true)
    try {
      if (selectedId) {
        await update(selectedId, editName, params)
      } else {
        const id = await add(editName || 'Novo Cenario', params)
        if (id) setSelectedId(id)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleNew(name?: string, overrideParams?: Partial<ScenarioParams>) {
    const baseParams = study ? paramsFromStudy(study) : DEFAULT_PARAMS
    const p = { ...baseParams, ...overrideParams }
    const id = await add(name ?? 'Novo Cenario', p)
    const created = scenarios.find((s) => s.id === id)
    if (created) loadScenario(created)
    else { reload() }
    setSelectedId(id)
    setEditName(name ?? 'Novo Cenario')
    setParams(p)
  }

  async function handleAutoGenerate() {
    if (!study) return
    const base = paramsFromStudy(study)
    await handleNew('Cenario Conservador', { tarifaVenda: base.tarifaVenda * 0.9, capexTotal: base.capexTotal * 1.1 })
    await handleNew('Cenario Base', {})
    await handleNew('Cenario Otimista', { tarifaVenda: base.tarifaVenda * 1.1, capexTotal: base.capexTotal * 0.9 })
  }

  const g = `repeat(2,1fr)`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, minHeight: 500 }}>

      {/* ── LEFT: lista de cenarios ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0, flex: 1 }}>Cenarios</h2>
          <Button size="sm" onClick={() => { setSelectedId(null); setEditName('Novo Cenario'); setParams(study ? paramsFromStudy(study) : DEFAULT_PARAMS) }} style={{ gap: 5, fontSize: 11 }}>
            <Plus style={{ width: 12, height: 12 }} /> Novo
          </Button>
          <Button size="sm" variant="outline" onClick={handleAutoGenerate} style={{ gap: 5, fontSize: 11 }} title="Gerar Cenarios Automaticos">
            <Wand2 style={{ width: 12, height: 12 }} /> Auto
          </Button>
        </div>

        {!studyId && (
          <div style={{ padding: 16, background: '#fff7ed', borderRadius: 10, border: '1px solid #fdba74', fontSize: 12, color: '#9a3412' }}>
            <AlertCircle style={{ width: 14, height: 14, display: 'inline', marginRight: 5 }} />
            Salve o estudo primeiro para criar cenarios.
          </div>
        )}

        {error && (
          <div style={{ padding: 10, background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#dc2626', marginBottom: 8 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Carregando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scenarios.map((sc) => (
              <ScenarioCard
                key={sc.id}
                sc={sc}
                selected={sc.id === selectedId}
                onSelect={() => loadScenario(sc)}
                onDuplicate={() => duplicate(sc)}
                onDelete={() => setDeleteId(sc.id ?? null)}
              />
            ))}
            {scenarios.length === 0 && studyId && !loading && (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 12 }}>
                <Zap style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Nenhum cenario criado</p>
                <p style={{ margin: '4px 0 0', fontSize: 11 }}>Clique em "Auto" para gerar automaticamente</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: editor de parametros ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nome do cenario"
            style={{ fontSize: 14, fontWeight: 700, flex: 1 }}
          />
          <Button onClick={handleSave} disabled={saving || !studyId} style={{ gap: 6 }}>
            {saving ? 'Salvando...' : selectedId ? 'Atualizar' : 'Criar'}
          </Button>
        </div>

        {/* Preview live */}
        {preview && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <Kpi label="TIR" value={pct(preview.tir)} color={preview.tir != null && preview.tir > 0 ? '#15803d' : '#dc2626'} />
            <Kpi label="VPL" value={money(preview.vpl)} color={preview.vpl >= 0 ? '#15803d' : '#dc2626'} />
            <Kpi label="Payback" value={preview.paybackSimples != null ? fmtNum(preview.paybackSimples, 1) + ' anos' : '—'} />
            <Kpi label="Rec. Bruta Ano 1" value={money(preview.receitaBrutaAno1)} />
            <Kpi label="EBITDA Acum." value={money(preview.ebitdaAcumulado)} />
          </div>
        )}
        {/* Geração calculada automaticamente */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <Kpi label="Geração Mensal" value={fmtNum(geracaoMensal, 1) + ' MWh'} />
          <Kpi label="Geração Anual" value={fmtNum(geracaoAnual, 1) + ' MWh'} />
          <Kpi label="Receita Acumulada" value={money(preview?.receitaAcumulada)} />
        </div>

        {/* Parametros */}
        <Section title="Dados Técnicos do Ativo">
          <div style={{ display: 'grid', gridTemplateColumns: g, gap: 10 }}>
            <NumField label="Potência Instalada" suffix="kW" value={params.potencia} onChange={(v) => setP('potencia', v)} />
            <NumField label="Demanda Contratada" suffix="kW" value={params.demanda} onChange={(v) => setP('demanda', v)} />
            <NumField label="Fator de Capacidade" suffix="%" value={params.fatorCapacidade} onChange={(v) => setP('fatorCapacidade', v)} hint="Recalcula geração e receita automaticamente" />
            <NumField label="Consumo Anual UG" suffix="MWh/ano" value={params.consumoAnualUG} onChange={(v) => setP('consumoAnualUG', v)} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                Fonte de Energia
              </label>
              <select
                value={params.fonte}
                onChange={(e) => setP('fonte', e.target.value as FonteGeracao)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: 'white' }}
              >
                {FONTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                Tipo GD
              </label>
              <select
                value={params.tipoGD}
                onChange={(e) => setP('tipoGD', e.target.value as TipoGD)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: 'white' }}
              >
                {TIPOGD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          {/* Geração recalculada inline */}
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 11, color: '#15803d' }}>
            ↻ Geração calculada: <strong>{fmtNum(geracaoMensal, 2)} MWh/mês</strong> · <strong>{fmtNum(geracaoAnual, 1)} MWh/ano</strong>
            {' '}({params.potencia} kW × {params.fatorCapacidade}% × 730 h ÷ 1000)
          </div>
        </Section>

        <Section title="Tarifas">
          <div style={{ display: 'grid', gridTemplateColumns: g, gap: 10 }}>
            <NumField label="Tarifa de Venda" suffix="R$/MWh" value={params.tarifaVenda} onChange={(v) => setP('tarifaVenda', v)} />
            <NumField label="TUSD G" suffix="R$/kW/mes" value={params.tusdG} onChange={(v) => setP('tusdG', v)} />
            <NumField label="Reajuste Anual" suffix="%" value={params.reajusteAnual} onChange={(v) => setP('reajusteAnual', v)} />
          </div>
        </Section>

        <Section title="Investimento (CAPEX)" open={false}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>CAPEX Total (R$)</label>
            <MoneyInput value={params.capexTotal} onChange={(v: number) => setP('capexTotal', v)} mode="money" />
          </div>
        </Section>

        <Section title="Custos Operacionais (OPEX)" open={false}>
          <div style={{ display: 'grid', gridTemplateColumns: g, gap: 10 }}>
            <NumField label="Operacao" suffix="% CAPEX/ano" value={params.opexOperacao} onChange={(v) => setP('opexOperacao', v)} />
            <NumField label="Manutencao" suffix="% CAPEX/ano" value={params.opexManutencao} onChange={(v) => setP('opexManutencao', v)} />
            <NumField label="Seguro" suffix="% CAPEX/ano" value={params.opexSeguro} onChange={(v) => setP('opexSeguro', v)} />
            <NumField label="Gestao" suffix="% Receita" value={params.opexGestao} onChange={(v) => setP('opexGestao', v)} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>Arrendamento (R$/mes)</label>
              <MoneyInput value={params.opexArrendamento} onChange={(v: number) => setP('opexArrendamento', v)} mode="money" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>Gestao Fixa (R$/mes)</label>
              <MoneyInput value={params.opexFixoGestao} onChange={(v: number) => setP('opexFixoGestao', v)} mode="money" />
            </div>
          </div>
        </Section>

        <Section title="Tributos" open={false}>
          <div style={{ display: 'grid', gridTemplateColumns: g, gap: 10 }}>
            <NumField label="Tributos s/ Receita" suffix="%" value={params.tributosReceita} onChange={(v) => setP('tributosReceita', v)} />
            <NumField label="PIS" suffix="%" value={params.pis} onChange={(v) => setP('pis', v)} />
            <NumField label="COFINS" suffix="%" value={params.cofins} onChange={(v) => setP('cofins', v)} />
            <NumField label="ICMS" suffix="%" value={params.icms} onChange={(v) => setP('icms', v)} />
          </div>
        </Section>

        <Section title="Premissas Financeiras" open={false}>
          <div style={{ display: 'grid', gridTemplateColumns: g, gap: 10 }}>
            <NumField label="TMA" suffix="% a.a." value={params.tma} onChange={(v) => setP('tma', v)} />
            <NumField label="SELIC" suffix="% a.a." value={params.selic} onChange={(v) => setP('selic', v)} />
            <NumField label="IPCA" suffix="% a.a." value={params.ipca} onChange={(v) => setP('ipca', v)} />
            <NumField label="Vida Util" suffix="anos" value={params.vidaUtil} onChange={(v) => setP('vidaUtil', v)} />
          </div>
        </Section>
      </div>

      {/* ── Modal confirmar exclusao ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, maxWidth: 360, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Excluir cenario?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Esta acao nao pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={async () => {
                await remove(deleteId)
                if (selectedId === deleteId) { setSelectedId(null) }
                setDeleteId(null)
              }}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
