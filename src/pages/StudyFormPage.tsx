/**
 * StudyFormPage.tsx
 * Formulário completo de cadastro/edição de estudo — 3 abas
 * Aba 01: Dados da Usina
 * Aba 02: Premissas
 * Aba 03: Parâmetros de Análise
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Info, ChevronRight, ChevronLeft,
  Zap, CircleDollarSign, SlidersHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { getStudy, createStudy, updateStudy } from '@/services/studyService'
import { STUDY_DEFAULTS } from '@/types/study'
import type { Study, FonteGeracao, TipoGD, DadosUsina, Premissas, ParametrosAnalise } from '@/types/study'

import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Label }   from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

// ─── Helpers ─────────────────────────────────────────────────

function FieldHint({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-muted-foreground inline cursor-help ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function FieldGroup({ label, required, hint, children, error }: {
  label: string; required?: boolean; hint?: string
  children: React.ReactNode; error?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label required={required}>
        {label}{hint && <FieldHint text={hint} />}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      <Separator className="mt-3" />
    </div>
  )
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function NumInput({ value, onChange, prefix, suffix, step = 1, min = 0, ...props }: {
  value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; min?: number
  placeholder?: string
}) {
  return (
    <Input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      prefix={prefix}
      suffix={suffix}
      step={step}
      min={min}
      {...props}
    />
  )
}

// ─── Estado do formulário ─────────────────────────────────────

type FormState = {
  dadosUsina: DadosUsina
  premissas:  Premissas
  parametros: ParametrosAnalise
}

function useFormState(initial: FormState) {
  const [state, setState] = useState<FormState>(initial)

  function updateUsina(patch: Partial<DadosUsina>) {
    setState((prev) => {
      const next = { ...prev.dadosUsina, ...patch }
      // Auto-calcular investimento total
      next.investimentoTotal = next.custoUsina + next.custoObraRede
      return { ...prev, dadosUsina: next }
    })
  }

  function updateTarifas(patch: Partial<Premissas['tarifas']>) {
    setState((prev) => ({
      ...prev,
      premissas: { ...prev.premissas, tarifas: { ...prev.premissas.tarifas, ...patch } },
    }))
  }

  function updateImpostos(patch: Partial<Premissas['impostos']>) {
    setState((prev) => ({
      ...prev,
      premissas: { ...prev.premissas, impostos: { ...prev.premissas.impostos, ...patch } },
    }))
  }

  function updateFinanceiras(patch: Partial<Premissas['financeiras']>) {
    setState((prev) => ({
      ...prev,
      premissas: { ...prev.premissas, financeiras: { ...prev.premissas.financeiras, ...patch } },
    }))
  }

  function updateCustos(patch: Partial<Premissas['custos']>) {
    setState((prev) => ({
      ...prev,
      premissas: { ...prev.premissas, custos: { ...prev.premissas.custos, ...patch } },
    }))
  }

  function updateParametros(patch: Partial<ParametrosAnalise>) {
    setState((prev) => ({ ...prev, parametros: { ...prev.parametros, ...patch } }))
  }

  function reset(data: FormState) { setState(data) }

  return { state, updateUsina, updateTarifas, updateImpostos, updateFinanceiras, updateCustos, updateParametros, reset }
}

// ─── Componente principal ─────────────────────────────────────

export default function StudyFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'novo'

  const [tab,     setTab]     = useState('usina')
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  const { state, updateUsina, updateTarifas, updateImpostos,
          updateFinanceiras, updateCustos, updateParametros, reset } = useFormState({
    dadosUsina: STUDY_DEFAULTS.dadosUsina,
    premissas:  STUDY_DEFAULTS.premissas,
    parametros: STUDY_DEFAULTS.parametros,
  })

  // Carrega estudo existente
  useEffect(() => {
    if (!isNew && id) {
      getStudy(id).then((s) => {
        if (s) {
          reset({ dadosUsina: s.dadosUsina, premissas: s.premissas, parametros: s.parametros })
        } else {
          toast.error('Estudo não encontrado.')
          navigate('/')
        }
        setLoading(false)
      }).catch(() => {
        toast.error('Erro ao carregar estudo.')
        setLoading(false)
      })
    }
  }, [id])

  // ─── Validação ──────────────────────────────────────────────

  function validate(): boolean {
    const e: Record<string, string> = {}
    const u = state.dadosUsina
    const p = state.parametros

    if (!u.nomeEstudo.trim()) { e.nomeEstudo = 'Informe o nome do estudo'; setTab('usina') }
    if (!u.nomeUsina.trim())  { e.nomeUsina  = 'Informe o nome da usina'; setTab('usina') }
    if (u.potencia <= 0)      { e.potencia   = 'Potência deve ser maior que zero'; setTab('usina') }
    if (u.custoUsina <= 0)    { e.custoUsina = 'Informe o custo da usina'; setTab('usina') }
    if (p.anoFinal <= p.anoInicial) { e.anoFinal = 'Ano final deve ser maior que o inicial'; setTab('parametros') }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Salvar ─────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        dadosUsina: state.dadosUsina,
        premissas:  state.premissas,
        parametros: state.parametros,
      }
      if (isNew) {
        await createStudy(payload)
        toast.success('Estudo criado com sucesso!')
      } else {
        await updateStudy(id!, payload)
        toast.success('Estudo atualizado com sucesso!')
      }
      navigate('/')
    } catch {
      toast.error('Erro ao salvar estudo.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Carregando estudo…</span>
        </div>
      </div>
    )
  }

  const u = state.dadosUsina
  const p = state.premissas
  const params = state.parametros

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">

        {/* Header */}
        <div className="page-header mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="page-title">{isNew ? 'Novo Estudo' : 'Editar Estudo'}</h1>
              <p className="page-subtitle">
                {u.nomeEstudo || 'Preencha os dados do estudo'}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} loading={saving} className="shrink-0">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando…' : 'Salvar Estudo'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="usina" className="gap-2">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dados da Usina</span>
              <span className="sm:hidden">Usina</span>
            </TabsTrigger>
            <TabsTrigger value="premissas" className="gap-2">
              <CircleDollarSign className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Premissas</span>
              <span className="sm:hidden">Premissas</span>
            </TabsTrigger>
            <TabsTrigger value="parametros" className="gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Parâmetros</span>
              <span className="sm:hidden">Parâmetros</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── ABA 01: Dados da Usina ─── */}
          <TabsContent value="usina" className="space-y-6">

            {/* Identificação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Identificação</CardTitle>
                <CardDescription>Nome do estudo e da usina avaliada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-2">
                  <FieldGroup label="Nome do Estudo" required error={errors.nomeEstudo}>
                    <Input
                      placeholder="Ex.: CGH Rio Verde – Cenário Base"
                      value={u.nomeEstudo}
                      onChange={(e) => updateUsina({ nomeEstudo: e.target.value })}
                      error={errors.nomeEstudo}
                    />
                  </FieldGroup>
                  <FieldGroup label="Nome da Usina" required error={errors.nomeUsina}>
                    <Input
                      placeholder="Ex.: CGH São João"
                      value={u.nomeUsina}
                      onChange={(e) => updateUsina({ nomeUsina: e.target.value })}
                      error={errors.nomeUsina}
                    />
                  </FieldGroup>
                </div>
              </CardContent>
            </Card>

            {/* Características técnicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Características Técnicas</CardTitle>
                <CardDescription>Fonte de energia, potência e especificações operacionais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="form-grid-3">
                  <FieldGroup label="Tipo de Fonte" required>
                    <Select value={u.fonte} onValueChange={(v) => updateUsina({ fonte: v as FonteGeracao })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solar">☀️ Solar (UFV)</SelectItem>
                        <SelectItem value="cgh">💧 CGH</SelectItem>
                        <SelectItem value="pch">🌊 PCH</SelectItem>
                        <SelectItem value="eolica">💨 Eólica</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                  <FieldGroup
                    label={`Potência (${u.fonte === 'solar' ? 'kWp' : 'kW'})`}
                    required
                    hint={u.fonte === 'solar' ? 'Potência de pico para usinas solares (kWp)' : 'Potência instalada em kW'}
                    error={errors.potencia}
                  >
                    <NumInput
                      value={u.potencia}
                      onChange={(v) => updateUsina({ potencia: v })}
                      suffix={u.fonte === 'solar' ? 'kWp' : 'kW'}
                      step={10}
                      error={errors.potencia}
                    />
                  </FieldGroup>
                  <FieldGroup label="Tipo de GD">
                    <Select value={u.tipoGD} onValueChange={(v) => updateUsina({ tipoGD: v as TipoGD })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GD I">GD I — até 75 kW</SelectItem>
                        <SelectItem value="GD II">GD II — 75 kW a 5 MW</SelectItem>
                        <SelectItem value="GD III">GD III — 5 MW a 30 MW</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>

                <div className="form-grid-3">
                  <FieldGroup label="Fator de Capacidade (%)" hint="Relação entre produção real e máxima teórica. Ex: CGH ≈ 35%">
                    <NumInput value={u.fatorCapacidade} onChange={(v) => updateUsina({ fatorCapacidade: v })} suffix="%" step={0.5} />
                  </FieldGroup>
                  <FieldGroup label="Demanda Contratada (kW)">
                    <NumInput value={u.demanda} onChange={(v) => updateUsina({ demanda: v })} suffix="kW" />
                  </FieldGroup>
                  <FieldGroup label="Consumo Anual UG (MWh/ano)" hint="Consumo anual da unidade gestora/consumidora">
                    <NumInput value={u.consumoAnualUG} onChange={(v) => updateUsina({ consumoAnualUG: v })} suffix="MWh" />
                  </FieldGroup>
                </div>

                <div className="form-grid-3">
                  <FieldGroup label="Degradação Anual (%)" hint="Redução anual de performance (ex: 0,5% para solar)">
                    <NumInput value={u.degradacaoAnual} onChange={(v) => updateUsina({ degradacaoAnual: v })} suffix="%" step={0.1} />
                  </FieldGroup>
                  <FieldGroup label="Disponibilidade (%)" hint="Percentual de tempo que a usina está operacional">
                    <NumInput value={u.disponibilidade} onChange={(v) => updateUsina({ disponibilidade: v })} suffix="%" step={0.5} max={100} />
                  </FieldGroup>
                  <FieldGroup label="Perdas Elétricas (%)" hint="Perdas por cabeamento, inversores, transformadores">
                    <NumInput value={u.perdasEletricas} onChange={(v) => updateUsina({ perdasEletricas: v })} suffix="%" step={0.5} />
                  </FieldGroup>
                </div>
              </CardContent>
            </Card>

            {/* Investimento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Investimento</CardTitle>
                <CardDescription>Custos de aquisição e implantação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="form-grid-2">
                  <FieldGroup label="Custo da Usina (R$)" required error={errors.custoUsina}>
                    <NumInput
                      value={u.custoUsina}
                      onChange={(v) => updateUsina({ custoUsina: v })}
                      prefix="R$"
                      step={10000}
                      error={errors.custoUsina}
                    />
                  </FieldGroup>
                  <FieldGroup label="Custo da Obra de Rede (R$)" hint="Adequação de rede, conexão, TUSD de acesso">
                    <NumInput value={u.custoObraRede} onChange={(v) => updateUsina({ custoObraRede: v })} prefix="R$" step={5000} />
                  </FieldGroup>
                </div>

                {/* Resumo calculado */}
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-primary font-medium uppercase tracking-wider">Investimento Total</p>
                      <p className="text-2xl font-bold text-primary mt-1">
                        {fmtCurrency(u.investimentoTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        R$ / {u.fonte === 'solar' ? 'kWp' : 'kW'}
                      </p>
                      <p className="text-lg font-semibold text-foreground mt-1">
                        {u.potencia > 0 ? fmtCurrency(u.investimentoTotal / u.potencia) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Fonte</p>
                      <div className="mt-1.5">
                        <Badge variant={u.fonte}>{u.fonte.toUpperCase()} · {u.tipoGD}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nav buttons */}
            <div className="flex justify-end">
              <Button onClick={() => setTab('premissas')}>
                Próximo: Premissas <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* ─── ABA 02: Premissas ─── */}
          <TabsContent value="premissas" className="space-y-6">

            {/* Tarifas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tarifas de Energia</CardTitle>
                <CardDescription>Valores em R$/MWh e R$/kW — baseados na homologação ANEEL vigente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-2">
                  <FieldGroup label="TE — Tarifa de Energia (R$/MWh)" hint="Tarifa de Energia da distribuidora local">
                    <NumInput value={p.tarifas.te} onChange={(v) => updateTarifas({ te: v })} prefix="R$" suffix="/MWh" step={10} />
                  </FieldGroup>
                  <FieldGroup label="TUSD (R$/MWh)" hint="Tarifa de Uso do Sistema de Distribuição">
                    <NumInput value={p.tarifas.tusd} onChange={(v) => updateTarifas({ tusd: v })} prefix="R$" suffix="/MWh" step={10} />
                  </FieldGroup>
                  <FieldGroup label="TUSD Geração (R$/MWh)" hint="Componente de uso da rede pelo gerador">
                    <NumInput value={p.tarifas.tusdGeracao} onChange={(v) => updateTarifas({ tusdGeracao: v })} prefix="R$" suffix="/MWh" step={1} />
                  </FieldGroup>
                  <FieldGroup label="Tarifa de Demanda (R$/kW)" hint="Custo fixo por kW de demanda contratada">
                    <NumInput value={p.tarifas.demanda} onChange={(v) => updateTarifas({ demanda: v })} prefix="R$" suffix="/kW" step={1} />
                  </FieldGroup>
                </div>
              </CardContent>
            </Card>

            {/* Impostos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Impostos sobre Receita</CardTitle>
                <CardDescription>Alíquotas incidentes sobre a receita de energia injetada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-3">
                  <FieldGroup label="PIS (%)" hint="Programa de Integração Social — alíquota padrão: 0,65%">
                    <NumInput value={p.impostos.pis} onChange={(v) => updateImpostos({ pis: v })} suffix="%" step={0.01} />
                  </FieldGroup>
                  <FieldGroup label="COFINS (%)" hint="Contribuição para Financiamento da Seguridade Social — padrão: 3%">
                    <NumInput value={p.impostos.cofins} onChange={(v) => updateImpostos({ cofins: v })} suffix="%" step={0.01} />
                  </FieldGroup>
                  <FieldGroup label="ICMS (%)" hint="Imposto sobre Circulação de Mercadorias — varia por estado">
                    <NumInput value={p.impostos.icms} onChange={(v) => updateImpostos({ icms: v })} suffix="%" step={0.5} />
                  </FieldGroup>
                </div>
              </CardContent>
            </Card>

            {/* Premissas Financeiras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Premissas Financeiras e Macroeconômicas</CardTitle>
                <CardDescription>Taxas de referência para os cálculos de rentabilidade (Fase 2)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="form-grid-4">
                  <FieldGroup label="Reajuste Anual (%)" hint="Taxa de reajuste das tarifas de energia ao ano">
                    <NumInput value={p.financeiras.reajusteAnual} onChange={(v) => updateFinanceiras({ reajusteAnual: v })} suffix="%" step={0.5} />
                  </FieldGroup>
                  <FieldGroup label="IPCA (% a.a.)" hint="Índice de Preços ao Consumidor Amplo anual">
                    <NumInput value={p.financeiras.ipca} onChange={(v) => updateFinanceiras({ ipca: v })} suffix="%" step={0.1} />
                  </FieldGroup>
                  <FieldGroup label="SELIC (% a.a.)" hint="Taxa básica de juros — benchmark de comparação">
                    <NumInput value={p.financeiras.selic} onChange={(v) => updateFinanceiras({ selic: v })} suffix="%" step={0.25} />
                  </FieldGroup>
                  <FieldGroup label="TMA (% a.a.)" hint="Taxa Mínima de Atratividade — hurdle rate do investidor">
                    <NumInput value={p.financeiras.tma} onChange={(v) => updateFinanceiras({ tma: v })} suffix="%" step={0.5} />
                  </FieldGroup>
                </div>
              </CardContent>
            </Card>

            {/* Custos Operacionais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Custos Operacionais</CardTitle>
                <CardDescription>Despesas recorrentes ao longo do período de análise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="form-grid-3">
                  <FieldGroup label="Manutenção (% inv./ano)" hint="Percentual anual sobre o investimento total">
                    <NumInput value={p.custos.manutencao} onChange={(v) => updateCustos({ manutencao: v })} suffix="%" step={0.1} />
                  </FieldGroup>
                  <FieldGroup label="Gestão (% receita)" hint="Percentual sobre a receita bruta anual">
                    <NumInput value={p.custos.gestao} onChange={(v) => updateCustos({ gestao: v })} suffix="%" step={0.5} />
                  </FieldGroup>
                  <FieldGroup label="Seguro (% inv./ano)" hint="Seguro patrimonial anual">
                    <NumInput value={p.custos.seguro} onChange={(v) => updateCustos({ seguro: v })} suffix="%" step={0.1} />
                  </FieldGroup>
                </div>
                <div className="form-grid-2">
                  <FieldGroup label="Arrendamento (R$/ano)" hint="Custo de arrendamento de terra ou área">
                    <NumInput value={p.custos.arrendamento} onChange={(v) => updateCustos({ arrendamento: v })} prefix="R$" step={1000} />
                  </FieldGroup>
                  <FieldGroup label="Gestão Fixa Mensal (R$/mês)" hint="Valor fixo mensal de gestão operacional (corrigido pelo IPCA)">
                    <NumInput value={p.custos.gestaoFixaMensal} onChange={(v) => updateCustos({ gestaoFixaMensal: v })} prefix="R$" step={100} />
                  </FieldGroup>
                </div>
              </CardContent>
            </Card>

            {/* Nav */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setTab('usina')}>
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button onClick={() => setTab('parametros')}>
                Próximo: Parâmetros <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* ─── ABA 03: Parâmetros ─── */}
          <TabsContent value="parametros" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Período de Análise</CardTitle>
                <CardDescription>
                  Define o horizonte temporal para projeção do fluxo de caixa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="form-grid-3">
                  <FieldGroup label="Ano Inicial" required>
                    <Input
                      type="number"
                      value={params.anoInicial}
                      onChange={(e) => updateParametros({ anoInicial: parseInt(e.target.value) || 2026 })}
                      min={2020}
                      max={2060}
                    />
                  </FieldGroup>
                  <FieldGroup label="Ano Final" required error={errors.anoFinal}>
                    <Input
                      type="number"
                      value={params.anoFinal}
                      onChange={(e) => updateParametros({ anoFinal: parseInt(e.target.value) || 2045 })}
                      min={params.anoInicial + 1}
                      max={2080}
                      error={errors.anoFinal}
                    />
                  </FieldGroup>
                  <FieldGroup
                    label="Meses no 1º Ano"
                    hint="Informe quantos meses a usina operará no primeiro ano (ex: se ligar em setembro, informe 4)"
                  >
                    <Select
                      value={params.mesesPrimeiroAno.toString()}
                      onValueChange={(v) => updateParametros({ mesesPrimeiroAno: parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem key={m} value={m.toString()}>{m} {m === 1 ? 'mês' : 'meses'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>

                {/* Resumo do período */}
                <div className="rounded-xl bg-muted/50 border border-border p-5">
                  <p className="text-sm font-semibold text-foreground mb-4">Resumo do período de análise</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Duração total', value: `${params.anoFinal - params.anoInicial + 1} anos` },
                      { label: 'Início', value: `${params.anoInicial}` },
                      { label: 'Primeiro ano', value: `${params.mesesPrimeiroAno} meses` },
                      { label: 'Fim', value: `${params.anoFinal}` },
                    ].map((item) => (
                      <div key={item.label} className="bg-background rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-base font-bold text-foreground mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Regra aplicada:</strong> O primeiro ano terá{' '}
                      <strong>{params.mesesPrimeiroAno} meses</strong> de produção.
                      De {params.anoInicial + 1} a {params.anoFinal}, serão considerados 12 meses por ano.
                      Total: <strong>{params.mesesPrimeiroAno + (params.anoFinal - params.anoInicial) * 12} meses</strong> de operação.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nav + Salvar */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setTab('premissas')}>
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button onClick={handleSave} loading={saving} size="lg" className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando…' : isNew ? 'Criar Estudo' : 'Salvar Alterações'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
