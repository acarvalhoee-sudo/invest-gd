/**
 * StudyFormPage.tsx - Fase 2
 * Wizard: Ativo / Premissas / Resultados
 *
 * v2: aba Resultados implementada com motor financeiro completo.
 *     Salva resultados (indicadores) no Firestore ao salvar o estudo.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, ChevronRight, ChevronLeft,
  Building2, CircleDollarSign, BarChart2,
  Info, CheckCircle2, Zap, Layers, GitCompare, Activity,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { getStudy, createStudy, updateStudy, saveResultados } from '@/services/studyService'
import { calcResultados } from '@/utils/financialEngine'
import {
  STUDY_DEFAULTS, CONCESSIONARIAS,
  calcCapexTotal, calcGeracaoMensal,
} from '@/types/study'
import type {
  Study, FonteGeracao, TipoGD,
  Ativo, Tarifas, Tributos, Capex, Opex, PremissasFinanceiras,
} from '@/types/study'

import { Button }     from '@/components/ui/button'
import { Input }      from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { Label }      from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import ResultadosTab       from '@/components/ResultadosTab'
import ScenariosTab      from '@/components/tabs/ScenariosTab'
import ComparativoTab    from '@/components/tabs/ComparativoTab'
import SensibilidadeTab  from '@/components/tabs/SensibilidadeTab'

// ─── Helpers UI ───────────────────────────────────────────────

function Hint({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-muted-foreground inline cursor-help ml-1 align-middle" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string
  error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {hint && <Hint text={hint} />}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function fmtCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function fmtNum(n: number, decimals = 1) {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Campo numérico simples (sem máscara BRL) — para inteiros pequenos */
function NumInput({
  value, onChange, suffix, step = 1, min = 0, max, error, placeholder,
}: {
  value: number; onChange: (v: number) => void
  suffix?: string; step?: number
  min?: number; max?: number; error?: string; placeholder?: string
}) {
  return (
    <Input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      suffix={suffix}
      step={step} min={min} max={max}
      error={error} placeholder={placeholder}
    />
  )
}

// ─── Wizard ───────────────────────────────────────────────────

const STEPS = [
  { id: 'ativo',        label: 'Ativo',        icon: <Building2        className="w-4 h-4" /> },
  { id: 'premissas',    label: 'Premissas',    icon: <CircleDollarSign className="w-4 h-4" /> },
  { id: 'resultados',   label: 'Resultados',   icon: <BarChart2         className="w-4 h-4" /> },
  { id: 'cenarios',     label: 'Cenarios',     icon: <Layers           className="w-4 h-4" /> },
  { id: 'comparativo',  label: 'Comparativo',  icon: <GitCompare       className="w-4 h-4" /> },
  { id: 'sensibilidade',label: 'Sensibilidade',icon: <Activity         className="w-4 h-4" /> },
]

function WizardHeader({ current, onChange }: {
  current: number; onChange: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <button
            onClick={() => onChange(i)}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              i === current
                ? 'bg-primary text-white shadow-sm'
                : i < current
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            <span className={
              i === current ? 'text-white'
              : i < current ? 'text-primary'
              : 'text-muted-foreground'
            }>
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
          {i < STEPS.length - 1 && (
            <div className={[
              'h-px flex-1 mx-2 transition-colors',
              i < current ? 'bg-primary' : 'bg-border',
            ].join(' ')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Estado do formulário ─────────────────────────────────────

type FormData = {
  ativo:                Ativo
  tarifas:              Tarifas
  tributos:             Tributos
  capex:                Capex
  opex:                 Opex
  premissasFinanceiras: PremissasFinanceiras
}

function useForm(initial: FormData) {
  const [state, setState] = useState<FormData>(initial)

  const set = <K extends keyof FormData>(key: K, patch: Partial<FormData[K]>) =>
    setState((prev) => ({
      ...prev,
      [key]: { ...(prev[key] as object), ...(patch as object) },
    }))

  function setAtivo(p: Partial<Ativo>) {
    setState((prev) => {
      const next = { ...prev.ativo, ...p }
      next.geracaoMediaMensal = calcGeracaoMensal(next.potencia, next.fatorCapacidade)
      return { ...prev, ativo: next }
    })
  }

  function setCapex(p: Partial<Capex>) {
    setState((prev) => {
      const next = { ...prev.capex, ...p }
      next.total = calcCapexTotal(next)
      return { ...prev, capex: next }
    })
  }

  function reset(d: FormData) { setState(d) }

  return { state, setAtivo, setCapex, set, reset }
}

// ─── Componente principal ─────────────────────────────────────

export default function StudyFormPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew    = !id || id === 'novo'

  const [step,    setStep]    = useState(0)
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [savedId, setSavedId] = useState<string | undefined>(isNew ? undefined : id)

  const { state, setAtivo, setCapex, set, reset } = useForm({
    ativo:                STUDY_DEFAULTS.ativo,
    tarifas:              STUDY_DEFAULTS.tarifas,
    tributos:             STUDY_DEFAULTS.tributos,
    capex:                STUDY_DEFAULTS.capex,
    opex:                 STUDY_DEFAULTS.opex,
    premissasFinanceiras: STUDY_DEFAULTS.premissasFinanceiras,
  })

  useEffect(() => {
    if (!isNew && id) {
      getStudy(id)
        .then((s) => {
          if (s) {
            reset({
              ativo:                s.ativo,
              tarifas:              s.tarifas,
              tributos:             s.tributos,
              capex:                s.capex,
              opex:                 s.opex,
              premissasFinanceiras: s.premissasFinanceiras,
            })
            setSavedId(s.id)
          } else {
            toast.error('Estudo nao encontrado.')
            navigate('/')
          }
          setLoading(false)
        })
        .catch(() => { toast.error('Erro ao carregar.'); setLoading(false) })
    }
  }, [id])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!state.ativo.nomeEstudo.trim()) e.nomeEstudo = 'Obrigatorio'
    if (!state.ativo.nomeUsina.trim())  e.nomeUsina  = 'Obrigatorio'
    if (state.ativo.potencia <= 0)      e.potencia   = 'Informe a potencia'
    if (state.capex.usina <= 0)         e.capexUsina = 'Informe o custo da usina'
    setErrors(e)
    if (Object.keys(e).length > 0) { setStep(0); return false }
    return true
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload: Omit<Study, 'id' | 'criadoEm' | 'atualizadoEm'> = {
        ativo:                state.ativo,
        tarifas:              state.tarifas,
        tributos:             state.tributos,
        capex:                state.capex,
        opex:                 state.opex,
        premissasFinanceiras: state.premissasFinanceiras,
        status:               'Em Elaboração',
        favorito:             false,
        tags:                 [],
      }

      let docId = savedId
      if (isNew || !docId) {
        docId = await createStudy(payload)
        setSavedId(docId)
        toast.success('Estudo criado!')
      } else {
        await updateStudy(docId, payload)
        toast.success('Estudo atualizado!')
      }

      // Salva indicadores dos resultados no Firestore
      try {
        const studyFull: Study = {
          ...payload,
          id: docId,
          criadoEm:    new Date().toISOString(),
          atualizadoEm:new Date().toISOString(),
        }
        const res = calcResultados(studyFull)
        await saveResultados(docId, res)
      } catch {
        // Falha silenciosa — não bloqueia o save principal
      }

      navigate('/')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  const a  = state.ativo
  const c  = state.capex
  const t  = state.tributos

  // Monta study completo para passar ao ResultadosTab
  const studyParaResultados: Study = {
    ativo:                state.ativo,
    tarifas:              state.tarifas,
    tributos:             state.tributos,
    capex:                state.capex,
    opex:                 state.opex,
    premissasFinanceiras: state.premissasFinanceiras,
    status:               'Em Elaboração',
    favorito:             false,
    tags:                 [],
    criadoEm:             new Date().toISOString(),
    atualizadoEm:         new Date().toISOString(),
  }

  // ═══════════════════════════════════════════════════════
  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="page-title">{isNew ? 'Novo Estudo' : 'Editar Estudo'}</h1>
              <p className="page-subtitle">{a.nomeEstudo || 'Preencha os dados do estudo'}</p>
            </div>
          </div>
          {step < 2 && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </div>

        <WizardHeader current={step} onChange={setStep} />

        {/* ════════════════════════════════════ */}
        {/* ABA 0 — ATIVO                        */}
        {/* ════════════════════════════════════ */}
        {step === 0 && (
          <div className="space-y-6">

            {/* Identificacao */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Identificacao</CardTitle>
                <CardDescription>
                  "Nome do Estudo" permite multiplas analises para a mesma usina.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-2">
                  <Field label="Nome do Estudo" required error={errors.nomeEstudo}>
                    <Input
                      placeholder="Ex.: CGH Sao Joao - Cenario Base"
                      value={a.nomeEstudo}
                      onChange={(e) => setAtivo({ nomeEstudo: e.target.value })}
                      error={errors.nomeEstudo}
                    />
                  </Field>
                  <Field label="Nome da Usina" required error={errors.nomeUsina}>
                    <Input
                      placeholder="Ex.: CGH Sao Joao"
                      value={a.nomeUsina}
                      onChange={(e) => setAtivo({ nomeUsina: e.target.value })}
                      error={errors.nomeUsina}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Caracteristicas Tecnicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Caracteristicas Tecnicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="form-grid-3">
                  <Field label="Tipo de Fonte" required>
                    <Select
                      value={a.fonte}
                      onValueChange={(v) => setAtivo({ fonte: v as FonteGeracao })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ufv">UFV</SelectItem>
                        <SelectItem value="cgh">CGH</SelectItem>
                        <SelectItem value="pch">PCH</SelectItem>
                        <SelectItem value="eolica">Eolica</SelectItem>
                        <SelectItem value="biomassa">Biomassa</SelectItem>
                        <SelectItem value="biogas">Biogas</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field
                    label={`Potencia (${a.fonte === 'ufv' || a.fonte === 'solar' ? 'kWp' : 'kW'})`}
                    required error={errors.potencia}
                  >
                    <MoneyInput
                      value={a.potencia}
                      onChange={(v) => setAtivo({ potencia: v })}
                      mode="money" prefix="" suffix={a.fonte === 'ufv' || a.fonte === 'solar' ? ' kWp' : ' kW'}
                      error={errors.potencia}
                    />
                  </Field>

                  <Field label="Tipo de GD">
                    <Select
                      value={a.tipoGD}
                      onValueChange={(v) => setAtivo({ tipoGD: v as TipoGD })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GD I">GD I</SelectItem>
                        <SelectItem value="GD II">GD II</SelectItem>
                        <SelectItem value="GD III">GD III</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="form-grid-3">
                  <Field label="Concessionaria">
                    <Select
                      value={a.concessionaria || ''}
                      onValueChange={(v) => setAtivo({ concessionaria: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {CONCESSIONARIAS.map((con) => (
                          <SelectItem key={con} value={con}>{con}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Fator de Capacidade (%)" hint="CGH ~35%, UFV ~22%">
                    <MoneyInput
                      value={a.fatorCapacidade}
                      onChange={(v) => setAtivo({ fatorCapacidade: Math.min(100, v) })}
                      mode="percent"
                    />
                  </Field>

                  <Field label="Demanda Contratada" hint="Demanda junto a distribuidora">
                    <MoneyInput
                      value={a.demanda}
                      onChange={(v) => setAtivo({ demanda: v })}
                      mode="money" prefix="" suffix=" kW"
                    />
                  </Field>
                </div>

                <div className="form-grid-2">
                  <Field label="Consumo Anual da UG">
                    <MoneyInput
                      value={a.consumoAnualUG}
                      onChange={(v) => setAtivo({ consumoAnualUG: v })}
                      mode="money" prefix="" suffix=" MWh"
                    />
                  </Field>

                  {/* Geracao Media Mensal — read-only */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                      <Zap className="w-3.5 h-3.5" />
                      Geracao Media Mensal
                      <Hint text="Potencia x FC x 730h / 1000" />
                    </label>
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/50 text-sm cursor-not-allowed">
                      <span className="font-semibold text-primary">
                        {a.geracaoMediaMensal > 0 ? fmtNum(a.geracaoMediaMensal) : '—'}
                      </span>
                      {a.geracaoMediaMensal > 0 && (
                        <span className="text-muted-foreground">MWh/mes</span>
                      )}
                    </div>
                    {a.geracaoMediaMensal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ~{fmtNum(a.geracaoMediaMensal * 12)} MWh/ano
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarifas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tarifas</CardTitle>
                <CardDescription>Valores de referencia ANEEL vigente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-3">
                  <Field label="TUSD G (R$/kW)" hint="Tarifa de Uso do Sistema de Distribuicao">
                    <MoneyInput
                      value={state.tarifas.tusdG}
                      onChange={(v) => set('tarifas', { tusdG: v })}
                      mode="money" prefix="" suffix=" R$/kW"
                    />
                  </Field>
                  <Field label="Tarifa de Venda (R$/MWh)" hint="Preco de venda da energia">
                    <MoneyInput
                      value={state.tarifas.tarifaVenda}
                      onChange={(v) => set('tarifas', { tarifaVenda: v })}
                      mode="money" prefix="R$ " suffix="/MWh"
                    />
                  </Field>
                  <Field label="Reajuste Anual (%)" hint="Reajuste anual da tarifa (fluxo de caixa)">
                    <MoneyInput
                      value={state.tarifas.reajusteAnual}
                      onChange={(v) => set('tarifas', { reajusteAnual: v })}
                      mode="percent"
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Tributacao */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tributacao</CardTitle>
                <CardDescription>
                  Campos independentes. "Tributos sobre Receita" e a aliquota utilizada nos calculos financeiros.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <Field
                    label="Tributos sobre Receita (%)"
                    hint="Aliquota efetiva para calcular receita liquida, VPL, TIR e Payback."
                  >
                    <MoneyInput
                      value={t.tributosReceita}
                      onChange={(v) => set('tributos', { tributosReceita: v })}
                      mode="percent"
                      className="bg-white"
                    />
                  </Field>
                  <p className="text-xs text-primary/70 mt-2">
                    Utilizado nos calculos financeiros
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-3">
                    PIS/COFINS/ICMS: simulacoes tarifarias — nao afetam os resultados financeiros.
                  </p>
                  <div className="form-grid-3">
                    <Field label="PIS (%)">
                      <MoneyInput value={t.pis} onChange={(v) => set('tributos', { pis: v })} mode="percent" />
                    </Field>
                    <Field label="COFINS (%)">
                      <MoneyInput value={t.cofins} onChange={(v) => set('tributos', { cofins: v })} mode="percent" />
                    </Field>
                    <Field label="ICMS (%)">
                      <MoneyInput value={t.icms} onChange={(v) => set('tributos', { icms: v })} mode="percent" />
                    </Field>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CAPEX */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CAPEX</CardTitle>
                <CardDescription>Investimento inicial no projeto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="form-grid-2">
                  <Field label="Custo da Usina" required error={errors.capexUsina}>
                    <MoneyInput
                      value={c.usina}
                      onChange={(v) => setCapex({ usina: v })}
                      mode="money"
                      error={errors.capexUsina}
                    />
                  </Field>
                  <Field label="Custo da Obra de Rede">
                    <MoneyInput
                      value={c.obraRede}
                      onChange={(v) => setCapex({ obraRede: v })}
                      mode="money"
                    />
                  </Field>
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">CAPEX Total</p>
                      <p className="text-3xl font-bold text-primary mt-1">{fmtCurrency(c.total)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Usina + Obra de Rede</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        R$ / {a.fonte === 'ufv' || a.fonte === 'solar' ? 'kWp' : 'kW'}
                      </p>
                      <p className="text-lg font-semibold text-foreground mt-1">
                        {a.potencia > 0 ? fmtCurrency(c.total / a.potencia) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setStep(1)}>
                Proxima: Premissas <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* ABA 1 — PREMISSAS                    */}
        {/* ════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-6">

            {/* OPEX */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">OPEX — Custos Operacionais</CardTitle>
                <CardDescription>
                  Operacao, Manutencao e Seguro: % do CAPEX Total (anuais, proporcionais no Ano 1).
                  Gestao: % da Receita Bruta. Arrendamento e Fixo Gestao: R$/mes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-3">
                  <Field label="Operacao (%)" hint="% do CAPEX Total (anual)">
                    <MoneyInput value={state.opex.operacao} onChange={(v) => set('opex', { operacao: v })} mode="percent" />
                  </Field>
                  <Field label="Manutencao (%)" hint="% do CAPEX Total (anual)">
                    <MoneyInput value={state.opex.manutencao} onChange={(v) => set('opex', { manutencao: v })} mode="percent" />
                  </Field>
                  <Field label="Seguro (%)" hint="% do CAPEX Total (anual)">
                    <MoneyInput value={state.opex.seguro} onChange={(v) => set('opex', { seguro: v })} mode="percent" />
                  </Field>
                  <Field label="Gestao (%)" hint="% da Receita Bruta">
                    <MoneyInput value={state.opex.gestao} onChange={(v) => set('opex', { gestao: v })} mode="percent" />
                  </Field>
                  <Field label="Arrendamento (R$/mes)">
                    <MoneyInput value={state.opex.arrendamento} onChange={(v) => set('opex', { arrendamento: v })} mode="money" />
                  </Field>
                  <Field label="Fixo de Gestao (R$/mes)" hint="Custo fixo mensal independente da receita">
                    <MoneyInput value={state.opex.fixoGestao} onChange={(v) => set('opex', { fixoGestao: v })} mode="money" />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Premissas Financeiras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Premissas Financeiras</CardTitle>
                <CardDescription>Parametros macroeconomicos do modelo de viabilidade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-3">
                  <Field label="Vida Util (anos)">
                    <NumInput
                      value={state.premissasFinanceiras.vidaUtil}
                      onChange={(v) => set('premissasFinanceiras', { vidaUtil: v })}
                      suffix=" anos" step={1} min={1} max={50}
                    />
                  </Field>
                  <Field label="TMA (%)" hint="Taxa Minima de Atratividade">
                    <MoneyInput
                      value={state.premissasFinanceiras.tma}
                      onChange={(v) => set('premissasFinanceiras', { tma: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field label="SELIC (%)">
                    <MoneyInput
                      value={state.premissasFinanceiras.selic}
                      onChange={(v) => set('premissasFinanceiras', { selic: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field label="Inflacao / IPCA (%)">
                    <MoneyInput
                      value={state.premissasFinanceiras.inflacao}
                      onChange={(v) => set('premissasFinanceiras', { inflacao: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field
                    label="Meses no Primeiro Ano"
                    hint="Meses de operacao no Ano 1. Ex.: inicio em setembro = 4 meses."
                  >
                    <NumInput
                      value={state.premissasFinanceiras.mesesPrimeiroAno}
                      onChange={(v) =>
                        set('premissasFinanceiras', {
                          mesesPrimeiroAno: Math.round(Math.max(1, Math.min(12, v))),
                        })
                      }
                      suffix=" meses" step={1} min={1} max={12}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button onClick={() => setStep(2)}>
                Ver Resultados <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* ABA 2 — RESULTADOS (motor Fase 2)    */}
        {/* ════════════════════════════════════ */}
        {step === 2 && (
          <ResultadosTab
            study={studyParaResultados}
            saving={saving}
            onSave={handleSave}
            onBack={() => setStep(1)}
            isNew={isNew}
          />
        )}

        {/* ════════════════════════════════════ */}
        {/* ABA 3 — CENARIOS                     */}
        {/* ════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4" /> Resultados
              </Button>
              <Button size="sm" onClick={() => setStep(4)}>
                Comparativo <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <ScenariosTab
              study={studyParaResultados}
              studyId={savedId ?? undefined}
            />
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* ABA 4 — COMPARATIVO                  */}
        {/* ════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4" /> Cenarios
              </Button>
              <Button size="sm" onClick={() => setStep(5)}>
                Sensibilidade <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <ComparativoTab
              study={studyParaResultados}
              studyId={savedId ?? undefined}
            />
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* ABA 5 — SENSIBILIDADE                */}
        {/* ════════════════════════════════════ */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setStep(4)}>
                <ChevronLeft className="w-4 h-4" /> Comparativo
              </Button>
            </div>
            <SensibilidadeTab study={studyParaResultados} />
          </div>
        )}

      </div>
    </TooltipProvider>
  )
}
