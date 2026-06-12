/**
 * StudyFormPage.tsx — Fase 1.1
 * Wizard: Ativo → Premissas → Resultados
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, ChevronRight, ChevronLeft,
  Building2, CircleDollarSign, BarChart2,
  Plus, Trash2, Info, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { getStudy, createStudy, updateStudy } from '@/services/studyService'
import { STUDY_DEFAULTS, calcCapexTotal } from '@/types/study'
import type {
  Study, FonteGeracao, TipoGD, TipoAquisicao,
  Ativo, Tarifas, Tributos, Capex, Opex,
  Reinvestimento, PremissasFinanceiras,
} from '@/types/study'

import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

// ─── Helpers UI ──────────────────────────────────────────────

function Hint({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-muted-foreground inline cursor-help ml-1 align-middle" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
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
      <Label required={required} className="flex items-center gap-1">
        {label}
        {hint && <Hint text={hint} />}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      <Separator className="mt-2" />
    </div>
  )
}

function fmtCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function NumInput({ value, onChange, prefix, suffix, step = 1, min = 0, max, error, ...rest }: {
  value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; min?: number; max?: number
  error?: string; placeholder?: string
}) {
  return (
    <Input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      prefix={prefix} suffix={suffix}
      step={step} min={min} max={max} error={error}
      {...rest}
    />
  )
}

// ─── Wizard steps ─────────────────────────────────────────────

const STEPS = [
  { id: 'ativo',     label: 'Ativo',     icon: <Building2         className="w-4 h-4" /> },
  { id: 'premissas', label: 'Premissas', icon: <CircleDollarSign  className="w-4 h-4" /> },
  { id: 'resultados',label: 'Resultados',icon: <BarChart2          className="w-4 h-4" /> },
]

function WizardHeader({ current, onChange }: { current: number; onChange: (i: number) => void }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <button
            onClick={() => onChange(i)}
            className={[
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              i === current
                ? "bg-primary text-white shadow-sm"
                : i < current
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:bg-muted",
            ].join(' ')}
          >
            <span className={i === current ? "text-white" : i < current ? "text-primary" : "text-muted-foreground"}>
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
          {i < STEPS.length - 1 && (
            <div className={["h-px flex-1 mx-2 transition-colors", i < current ? "bg-primary" : "bg-border"].join(' ')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Form state ───────────────────────────────────────────────

type FormData = {
  ativo:                Ativo
  tarifas:              Tarifas
  tributos:             Tributos
  capex:                Capex
  opex:                 Opex
  reinvestimentos:      Reinvestimento[]
  premissasFinanceiras: PremissasFinanceiras
}

function useForm(initial: FormData) {
  const [state, setState] = useState<FormData>(initial)

  const set = <K extends keyof FormData>(key: K, patch: Partial<FormData[K]>) =>
    setState((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...(patch as object) } }))

  function setAtivo(p: Partial<Ativo>) {
    setState((prev) => {
      const next = { ...prev.ativo, ...p }
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

  function setReinv(list: Reinvestimento[]) {
    setState((prev) => ({ ...prev, reinvestimentos: list }))
  }

  function reset(d: FormData) { setState(d) }

  return { state, setAtivo, setCapex, set, setReinv, reset }
}

// ─── Componente principal ─────────────────────────────────────

export default function StudyFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const isNew     = !id || id === 'novo'

  const [step,    setStep]    = useState(0)
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  const { state, setAtivo, setCapex, set, setReinv, reset } = useForm({
    ativo:                STUDY_DEFAULTS.ativo,
    tarifas:              STUDY_DEFAULTS.tarifas,
    tributos:             STUDY_DEFAULTS.tributos,
    capex:                STUDY_DEFAULTS.capex,
    opex:                 STUDY_DEFAULTS.opex,
    reinvestimentos:      STUDY_DEFAULTS.reinvestimentos,
    premissasFinanceiras: STUDY_DEFAULTS.premissasFinanceiras,
  })

  useEffect(() => {
    if (!isNew && id) {
      getStudy(id).then((s) => {
        if (s) {
          reset({
            ativo:                s.ativo,
            tarifas:              s.tarifas,
            tributos:             s.tributos,
            capex:                s.capex,
            opex:                 s.opex,
            reinvestimentos:      s.reinvestimentos ?? [],
            premissasFinanceiras: s.premissasFinanceiras,
          })
        } else {
          toast.error('Estudo nao encontrado.')
          navigate('/')
        }
        setLoading(false)
      }).catch(() => { toast.error('Erro ao carregar.'); setLoading(false) })
    }
  }, [id])

  function validate(): boolean {
    const e: Record<string, string> = {}
    const a = state.ativo
    if (!a.nomeEstudo.trim()) e.nomeEstudo = 'Obrigatorio'
    if (!a.nomeUsina.trim())  e.nomeUsina  = 'Obrigatorio'
    if (a.potencia <= 0)      e.potencia   = 'Informe a potencia'
    if (state.capex.usina <= 0) e.capexUsina = 'Informe o custo da usina'
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
        reinvestimentos:      state.reinvestimentos,
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
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  const a  = state.ativo
  const c  = state.capex
  const pf = state.premissasFinanceiras

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">

        {/* Header */}
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
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        {/* Wizard */}
        <WizardHeader current={step} onChange={setStep} />

        {/* ──────────────────────────────────────── */}
        {/* ABA 0 — ATIVO                            */}
        {/* ──────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">

            {/* Identificacao */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Identificacao</CardTitle>
                <CardDescription>O Nome do Estudo permite multiplas analises para a mesma usina — ex.: "CGH Sao Joao - Base", "CGH Sao Joao - Financiado"</CardDescription>
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
                    <Select value={a.fonte} onValueChange={(v) => setAtivo({ fonte: v as FonteGeracao })}>
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
                    label={`Potencia Instalada (${a.fonte === 'ufv' ? 'kWp' : 'kW'})`}
                    required
                    hint={a.fonte === 'ufv' ? 'Potencia de pico para usinas fotovoltaicas' : 'Potencia instalada em kW'}
                    error={errors.potencia}
                  >
                    <NumInput
                      value={a.potencia}
                      onChange={(v) => setAtivo({ potencia: v })}
                      suffix={a.fonte === 'ufv' ? 'kWp' : 'kW'}
                      step={10}
                      error={errors.potencia}
                    />
                  </Field>
                  <Field label="Tipo de GD" hint="Classificacao regulatoria da geracao distribuida">
                    <Select value={a.tipoGD} onValueChange={(v) => setAtivo({ tipoGD: v as TipoGD })}>
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
                  <Field label="Tipo de Aquisicao">
                    <Select value={a.tipoAquisicao} onValueChange={(v) => setAtivo({ tipoAquisicao: v as TipoAquisicao })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greenfield">Greenfield</SelectItem>
                        <SelectItem value="compra_ativo">Compra de Ativo Existente</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Fator de Capacidade (%)" hint="Relacao entre producao real e maxima teorica. CGH ~ 35%, UFV ~ 22%">
                    <NumInput value={a.fatorCapacidade} onChange={(v) => setAtivo({ fatorCapacidade: v })} suffix="%" step={0.5} max={100} />
                  </Field>
                  <Field label="Demanda Contratada" hint="Demanda contratada junto a distribuidora">
                    <NumInput value={a.demanda} onChange={(v) => setAtivo({ demanda: v })} suffix="kW" />
                  </Field>
                </div>

                <div className="form-grid-2">
                  <Field label="Consumo Anual da UG" hint="Consumo anual da unidade gestora/consumidora beneficiada">
                    <NumInput value={a.consumoAnualUG} onChange={(v) => setAtivo({ consumoAnualUG: v })} suffix="MWh" />
                  </Field>
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
                <div className="form-grid-2">
                  <Field label="TUSD G" hint="Tarifa de Uso do Sistema de Distribuicao — componente geracao (R$/kW)">
                    <NumInput value={state.tarifas.tusdG} onChange={(v) => set('tarifas', { tusdG: v })} suffix="R$/kW" step={1} />
                  </Field>
                  <Field label="Tarifa de Venda" hint="Preco de venda da energia injetada (R$/MWh)">
                    <NumInput value={state.tarifas.tarifaVenda} onChange={(v) => set('tarifas', { tarifaVenda: v })} suffix="R$/MWh" step={10} />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Tributacao */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tributacao</CardTitle>
                <CardDescription>Aliquota total sobre receita (PIS + COFINS + ICMS)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs">
                  <Field label="Tributos (%)" hint="Soma das aliquotas incidentes sobre a receita bruta">
                    <NumInput value={state.tributos.aliquota} onChange={(v) => set('tributos', { aliquota: v })} suffix="%" step={0.01} max={100} />
                  </Field>
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
                    <NumInput value={c.usina} onChange={(v) => setCapex({ usina: v })} prefix="R$" step={10000} error={errors.capexUsina} />
                  </Field>
                  <Field label="Obra de Rede" hint="Adequacao de rede, conexao, TUSD de acesso">
                    <NumInput value={c.obraRede} onChange={(v) => setCapex({ obraRede: v })} prefix="R$" step={5000} />
                  </Field>
                  <Field label="Engenharia">
                    <NumInput value={c.engenharia} onChange={(v) => setCapex({ engenharia: v })} prefix="R$" step={5000} />
                  </Field>
                  <Field label="Licenciamento" hint="Custos com licencas ambientais, ANEEL, prefeitura">
                    <NumInput value={c.licenciamento} onChange={(v) => setCapex({ licenciamento: v })} prefix="R$" step={1000} />
                  </Field>
                  <Field label="Comissionamento" hint="Testes, startup, treinamento">
                    <NumInput value={c.comissionamento} onChange={(v) => setCapex({ comissionamento: v })} prefix="R$" step={1000} />
                  </Field>
                  <Field label="Contingencia (%)" hint="Reserva para imprevistos — aplicada sobre soma dos demais itens">
                    <NumInput value={c.contingencia} onChange={(v) => setCapex({ contingencia: v })} suffix="%" step={0.5} max={50} />
                  </Field>
                </div>

                {/* CAPEX Total destaque */}
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">CAPEX Total</p>
                      <p className="text-3xl font-bold text-primary mt-1">{fmtCurrency(c.total)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Base + contingencia de {c.contingencia}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">R$ / {a.fonte === 'ufv' ? 'kWp' : 'kW'}</p>
                      <p className="text-lg font-semibold text-foreground mt-1">
                        {a.potencia > 0 ? fmtCurrency(c.total / a.potencia) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Fonte</p>
                      <div className="mt-2">
                        <Badge variant={a.fonte}>{a.fonte.toUpperCase()} · {a.tipoGD}</Badge>
                      </div>
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

        {/* ──────────────────────────────────────── */}
        {/* ABA 1 — PREMISSAS                        */}
        {/* ──────────────────────────────────────── */}
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
                    <NumInput value={state.opex.operacao} onChange={(v) => set('opex', { operacao: v })} suffix="%" step={0.1} max={20} />
                  </Field>
                  <Field label="Manutencao (%)" hint="Manutencao preventiva e corretiva — percentual do CAPEX">
                    <NumInput value={state.opex.manutencao} onChange={(v) => set('opex', { manutencao: v })} suffix="%" step={0.1} max={20} />
                  </Field>
                  <Field label="Seguro (%)" hint="Seguro patrimonial anual — percentual do CAPEX">
                    <NumInput value={state.opex.seguro} onChange={(v) => set('opex', { seguro: v })} suffix="%" step={0.05} max={10} />
                  </Field>
                  <Field label="Gestao (%)" hint="Taxa de gestao — percentual sobre receita bruta">
                    <NumInput value={state.opex.gestao} onChange={(v) => set('opex', { gestao: v })} suffix="%" step={0.5} max={30} />
                  </Field>
                  <Field label="Arrendamento" hint="Custo anual de arrendamento de area ou terreno">
                    <NumInput value={state.opex.arrendamento} onChange={(v) => set('opex', { arrendamento: v })} prefix="R$" step={1000} />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Reinvestimentos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Reinvestimentos</CardTitle>
                    <CardDescription>Substituicoes e melhorias planejadas ao longo do projeto</CardDescription>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => {
                      const novo: Reinvestimento = {
                        id: Date.now().toString(),
                        ano: pf.vidaUtil > 0 ? Math.round(pf.vidaUtil / 2) : 10,
                        descricao: '',
                        valor: 0,
                      }
                      setReinv([...state.reinvestimentos, novo])
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {state.reinvestimentos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhum reinvestimento cadastrado.</p>
                    <p className="text-xs mt-1">Exemplo: troca de inversores no ano 12.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-1">
                      <div className="col-span-2">Ano</div>
                      <div className="col-span-6">Descricao</div>
                      <div className="col-span-3">Valor (R$)</div>
                      <div className="col-span-1" />
                    </div>
                    {state.reinvestimentos.map((r) => (
                      <div key={r.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={r.ano || ''}
                            min={1}
                            max={50}
                            onChange={(e) => setReinv(state.reinvestimentos.map((x) =>
                              x.id === r.id ? { ...x, ano: parseInt(e.target.value) || 0 } : x
                            ))}
                          />
                        </div>
                        <div className="col-span-6">
                          <Input
                            placeholder="Ex.: Troca de Inversores"
                            value={r.descricao}
                            onChange={(e) => setReinv(state.reinvestimentos.map((x) =>
                              x.id === r.id ? { ...x, descricao: e.target.value } : x
                            ))}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            value={r.valor || ''}
                            min={0}
                            step={1000}
                            onChange={(e) => setReinv(state.reinvestimentos.map((x) =>
                              x.id === r.id ? { ...x, valor: parseFloat(e.target.value) || 0 } : x
                            ))}
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setReinv(state.reinvestimentos.filter((x) => x.id !== r.id))}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground pt-1 text-right">
                      Total reinvestimentos: {state.reinvestimentos.reduce((s, x) => s + x.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Premissas Financeiras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Premissas Financeiras</CardTitle>
                <CardDescription>Parametros macroeconomicos para o modelo de viabilidade (Fase 2)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-4">
                  <Field label="Vida Util" hint="Horizonte de analise do projeto em anos">
                    <NumInput value={pf.vidaUtil} onChange={(v) => set('premissasFinanceiras', { vidaUtil: v })} suffix="anos" step={1} min={1} max={50} />
                  </Field>
                  <Field label="TMA / Desconto" hint="Taxa Minima de Atratividade — hurdle rate do investidor">
                    <NumInput value={pf.tma} onChange={(v) => set('premissasFinanceiras', { tma: v })} suffix="% a.a." step={0.25} />
                  </Field>
                  <Field label="SELIC" hint="Taxa basica de juros — benchmark de comparacao">
                    <NumInput value={pf.selic} onChange={(v) => set('premissasFinanceiras', { selic: v })} suffix="% a.a." step={0.25} />
                  </Field>
                  <Field label="Inflacao (IPCA)" hint="Projecao de inflacao anual para correcao de valores">
                    <NumInput value={pf.inflacao} onChange={(v) => set('premissasFinanceiras', { inflacao: v })} suffix="% a.a." step={0.1} />
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

        {/* ──────────────────────────────────────── */}
        {/* ABA 2 — RESULTADOS (placeholder)         */}
        {/* ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resultados Financeiros</CardTitle>
                <CardDescription>Indicadores de viabilidade economico-financeira do projeto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center mb-6">
                  <BarChart2 className="w-10 h-10 text-primary mx-auto mb-3 opacity-70" />
                  <p className="text-sm font-semibold text-foreground">Calculos financeiros serao implementados na Fase 2.</p>
                  <p className="text-xs text-muted-foreground mt-1">Salve o estudo para preservar as premissas cadastradas.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Geracao Anual', unit: 'MWh/ano' },
                    { label: 'Receita Anual', unit: 'R$/ano' },
                    { label: 'OPEX Anual',    unit: 'R$/ano' },
                    { label: 'EBITDA',        unit: 'R$/ano' },
                    { label: 'VPL',           unit: 'R$' },
                    { label: 'TIR',           unit: '% a.a.' },
                    { label: 'Payback Simples',    unit: 'anos' },
                    { label: 'Payback Descontado', unit: 'anos' },
                    { label: 'CAPEX Total',   unit: 'R$', value: fmtCurrency(c.total) },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/50 border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-bold text-foreground mt-1">
                        {item.value ?? <span className="text-muted-foreground/50 font-normal italic text-xs">—</span>}
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
              <Button onClick={handleSave} loading={saving} size="lg">
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
