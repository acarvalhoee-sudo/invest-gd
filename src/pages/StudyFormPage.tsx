/**
 * StudyFormPage.tsx - Fase 1.4
 * Wizard: Ativo / Premissas / Resultados
 *
 * Mudancas v1.4:
 * - MoneyInput com mascara brasileira (1.000,00 / 12,65%)
 * - tributosReceita adicionado como campo independente
 * - aliquotaTotal REMOVIDO — tributos sem calculo automatico
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, ChevronRight, ChevronLeft,
  Building2, CircleDollarSign, BarChart2,
  Info, CheckCircle2, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { getStudy, createStudy, updateStudy } from '@/services/studyService'
import {
  STUDY_DEFAULTS, CONCESSIONARIAS,
  calcCapexTotal, calcGeracaoMensal,
} from '@/types/study'
import type {
  Study, FonteGeracao, TipoGD,
  Ativo, Tarifas, Tributos, Capex, Opex, PremissasFinanceiras,
} from '@/types/study'

import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { Label }     from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

/** Campo numerico simples (sem mascara BRL) — para inteiros pequenos como anos e meses */
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
  { id: 'ativo',      label: 'Ativo',      icon: <Building2        className="w-4 h-4" /> },
  { id: 'premissas',  label: 'Premissas',  icon: <CircleDollarSign className="w-4 h-4" /> },
  { id: 'resultados', label: 'Resultados', icon: <BarChart2         className="w-4 h-4" /> },
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

// ─── Estado do formulario ─────────────────────────────────────

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
      }
      if (isNew) {
        await createStudy(payload)
        toast.success('Estudo criado!')
      } else {
        await updateStudy(id!, payload)
        toast.success('Estudo atualizado!')
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
  const pf = state.premissasFinanceiras

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
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
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
                  "Nome do Estudo" permite multiplas analises para a mesma usina —
                  ex.: "CGH Sao Joao - Base", "CGH Sao Joao - Financiado"
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

                {/* Linha 1: Fonte / Potencia / TipoGD */}
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
                    label={`Potencia Instalada (${a.fonte === 'ufv' || a.fonte === 'solar' ? 'kWp' : 'kW'})`}
                    required
                    hint={a.fonte === 'ufv' || a.fonte === 'solar'
                      ? 'Potencia de pico para usinas fotovoltaicas'
                      : 'Potencia instalada'}
                    error={errors.potencia}
                  >
                    <MoneyInput
                      value={a.potencia}
                      onChange={(v) => setAtivo({ potencia: v })}
                      mode="money"
                      prefix=""
                      suffix={a.fonte === 'ufv' || a.fonte === 'solar' ? ' kWp' : ' kW'}
                      error={errors.potencia}
                    />
                  </Field>

                  <Field label="Tipo de GD" hint="Classificacao regulatoria da geracao distribuida">
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

                {/* Linha 2: Concessionaria / FC / Demanda */}
                <div className="form-grid-3">
                  <Field
                    label="Concessionaria"
                    hint="Distribuidora de energia eletrica da area de concessao do projeto"
                  >
                    <Select
                      value={a.concessionaria || ''}
                      onValueChange={(v) => setAtivo({ concessionaria: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CONCESSIONARIAS.map((con) => (
                          <SelectItem key={con} value={con}>{con}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field
                    label="Fator de Capacidade (%)"
                    hint="Relacao entre producao real e maxima teorica. CGH ~35%, UFV ~22%"
                  >
                    <MoneyInput
                      value={a.fatorCapacidade}
                      onChange={(v) => setAtivo({ fatorCapacidade: Math.min(100, v) })}
                      mode="percent"
                    />
                  </Field>

                  <Field label="Demanda Contratada" hint="Demanda contratada junto a distribuidora">
                    <MoneyInput
                      value={a.demanda}
                      onChange={(v) => setAtivo({ demanda: v })}
                      mode="money"
                      prefix=""
                      suffix=" kW"
                    />
                  </Field>
                </div>

                {/* Linha 3: Consumo UG / Geracao Mensal (read-only) */}
                <div className="form-grid-2">
                  <Field label="Consumo Anual da UG" hint="Consumo anual da unidade gestora beneficiada">
                    <MoneyInput
                      value={a.consumoAnualUG}
                      onChange={(v) => setAtivo({ consumoAnualUG: v })}
                      mode="money"
                      prefix=""
                      suffix=" MWh"
                    />
                  </Field>

                  {/* Geracao Media Mensal — calculado automaticamente */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                      <Zap className="w-3.5 h-3.5" />
                      Geracao Media Mensal
                      <Hint text="Calculado: Potencia x Fator de Capacidade x 730h / 1000. Refinado na Fase 2." />
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
                  <Field label="TUSD G (R$/kW)" hint="Tarifa de Uso do Sistema de Distribuicao — componente geracao">
                    <MoneyInput
                      value={state.tarifas.tusdG}
                      onChange={(v) => set('tarifas', { tusdG: v })}
                      mode="money"
                      prefix=""
                      suffix=" R$/kW"
                    />
                  </Field>
                  <Field label="Tarifa de Venda (R$/MWh)" hint="Preco de venda da energia injetada">
                    <MoneyInput
                      value={state.tarifas.tarifaVenda}
                      onChange={(v) => set('tarifas', { tarifaVenda: v })}
                      mode="money"
                      prefix="R$ "
                      suffix="/MWh"
                    />
                  </Field>
                  <Field
                    label="Reajuste Anual (%)"
                    hint="Percentual de reajuste anual da tarifa — utilizado no fluxo de caixa (Fase 2)"
                  >
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
                  Campos independentes — nenhum campo e calculado com base nos outros.
                  "Tributos sobre Receita" e a aliquota efetiva utilizada nos calculos financeiros.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Tributos sobre Receita — campo primario */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <Field
                    label="Tributos sobre Receita (%)"
                    hint="Aliquota efetiva total utilizada para calcular a receita liquida, VPL, TIR e Payback. Independente dos campos PIS/COFINS/ICMS abaixo."
                  >
                    <MoneyInput
                      value={t.tributosReceita}
                      onChange={(v) => set('tributos', { tributosReceita: v })}
                      mode="percent"
                      className="bg-white"
                    />
                  </Field>
                  <p className="text-xs text-primary/70 mt-2">
                    Utilizado nos calculos financeiros (Receita Liquida, Fluxo de Caixa, VPL, TIR, Payback)
                  </p>
                </div>

                {/* PIS / COFINS / ICMS */}
                <div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Campos abaixo destinados a simulacoes tarifarias e memorial de calculo — nao alteram os resultados financeiros.
                  </p>
                  <div className="form-grid-3">
                    <Field label="PIS (%)" hint="Programa de Integracao Social — aliquota sobre receita (uso tarifario)">
                      <MoneyInput
                        value={t.pis}
                        onChange={(v) => set('tributos', { pis: v })}
                        mode="percent"
                      />
                    </Field>
                    <Field label="COFINS (%)" hint="Contribuicao para Financiamento da Seguridade Social (uso tarifario)">
                      <MoneyInput
                        value={t.cofins}
                        onChange={(v) => set('tributos', { cofins: v })}
                        mode="percent"
                      />
                    </Field>
                    <Field label="ICMS (%)" hint="Imposto sobre Circulacao de Mercadorias e Servicos — aliquota estadual (uso tarifario)">
                      <MoneyInput
                        value={t.icms}
                        onChange={(v) => set('tributos', { icms: v })}
                        mode="percent"
                      />
                    </Field>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CAPEX */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CAPEX</CardTitle>
                <CardDescription>Capital expenditure — investimento inicial no projeto</CardDescription>
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
                  <Field label="Custo da Obra de Rede" hint="Adequacao de rede, conexao e acesso ao sistema de distribuicao">
                    <MoneyInput
                      value={c.obraRede}
                      onChange={(v) => setCapex({ obraRede: v })}
                      mode="money"
                    />
                  </Field>
                </div>

                {/* CAPEX Total em destaque */}
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
                <CardDescription>Despesas anuais recorrentes ao longo da vida do projeto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="form-grid-3">
                  <Field label="Operacao (%)" hint="Custos de operacao anual — percentual do CAPEX">
                    <MoneyInput
                      value={state.opex.operacao}
                      onChange={(v) => set('opex', { operacao: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field label="Manutencao (%)" hint="Manutencao preventiva e corretiva — percentual do CAPEX">
                    <MoneyInput
                      value={state.opex.manutencao}
                      onChange={(v) => set('opex', { manutencao: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field label="Seguro (%)" hint="Seguro patrimonial anual — percentual do CAPEX">
                    <MoneyInput
                      value={state.opex.seguro}
                      onChange={(v) => set('opex', { seguro: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field label="Gestao (%)" hint="Taxa de gestao — percentual sobre receita bruta">
                    <MoneyInput
                      value={state.opex.gestao}
                      onChange={(v) => set('opex', { gestao: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field label="Arrendamento (R$/mes)" hint="Custo mensal de arrendamento de area ou terreno">
                    <MoneyInput
                      value={state.opex.arrendamento}
                      onChange={(v) => set('opex', { arrendamento: v })}
                      mode="money"
                    />
                  </Field>
                  <Field
                    label="Fixo de Gestao (R$/mes)"
                    hint="Custos fixos mensais administrativos e de gestao da usina — independente da receita"
                  >
                    <MoneyInput
                      value={state.opex.fixoGestao}
                      onChange={(v) => set('opex', { fixoGestao: v })}
                      mode="money"
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Premissas Financeiras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Premissas Financeiras</CardTitle>
                <CardDescription>
                  Parametros macroeconomicos para o modelo de viabilidade (Fase 2)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-3">
                  <Field label="Vida Util do Projeto" hint="Horizonte de analise do projeto em anos">
                    <NumInput
                      value={pf.vidaUtil}
                      onChange={(v) => set('premissasFinanceiras', { vidaUtil: v })}
                      suffix=" anos" step={1} min={1} max={50}
                    />
                  </Field>
                  <Field label="Taxa de Desconto / TMA" hint="Taxa Minima de Atratividade — hurdle rate do investidor">
                    <MoneyInput
                      value={pf.tma}
                      onChange={(v) => set('premissasFinanceiras', { tma: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field label="SELIC" hint="Taxa basica de juros — benchmark de comparacao">
                    <MoneyInput
                      value={pf.selic}
                      onChange={(v) => set('premissasFinanceiras', { selic: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field label="Inflacao (IPCA)" hint="Projecao de inflacao anual para correcao de valores">
                    <MoneyInput
                      value={pf.inflacao}
                      onChange={(v) => set('premissasFinanceiras', { inflacao: v })}
                      mode="percent"
                    />
                  </Field>
                  <Field
                    label="Meses no Primeiro Ano"
                    hint="Quantos meses de operacao no primeiro ano. Ex.: inicio em setembro = 4 meses."
                  >
                    <NumInput
                      value={pf.mesesPrimeiroAno}
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
                Proxima: Resultados <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* ABA 2 — RESULTADOS (placeholder)    */}
        {/* ════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resultados Financeiros</CardTitle>
                <CardDescription>
                  Indicadores de viabilidade economico-financeira do projeto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center mb-6">
                  <BarChart2 className="w-10 h-10 text-primary mx-auto mb-3 opacity-70" />
                  <p className="text-sm font-semibold text-foreground">
                    Calculos financeiros serao implementados na Fase 2.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Salve o estudo para preservar as premissas cadastradas.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Geracao Anual', unit: 'MWh/ano',
                      value: a.geracaoMediaMensal > 0
                        ? fmtNum(a.geracaoMediaMensal * 12) : null,
                    },
                    { label: 'Receita Anual',      unit: 'R$/ano' },
                    { label: 'OPEX Anual',         unit: 'R$/ano' },
                    { label: 'EBITDA',             unit: 'R$/ano' },
                    { label: 'VPL',                unit: 'R$'     },
                    { label: 'TIR',                unit: '% a.a.' },
                    { label: 'Payback Simples',    unit: 'anos'   },
                    { label: 'Payback Descontado', unit: 'anos'   },
                    {
                      label: 'CAPEX Total', unit: 'R$',
                      value: fmtCurrency(c.total),
                    },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/50 border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-bold text-foreground mt-1">
                        {item.value
                          ? item.value
                          : <span className="text-muted-foreground/50 font-normal italic text-xs">—</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">{item.unit}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button onClick={handleSave} disabled={saving} size="lg">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : isNew ? 'Criar Estudo' : 'Salvar Alteracoes'}
              </Button>
            </div>
          </div>
        )}

      </div>
    </TooltipProvider>
  )
}
