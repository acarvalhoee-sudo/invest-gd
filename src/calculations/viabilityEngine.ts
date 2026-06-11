/**
 * viabilityEngine.ts
 * Motor de cálculo de viabilidade econômico-financeira
 *
 * Toda a lógica está isolada da interface, facilitando testes e auditoria.
 * Os algoritmos seguem a metodologia da planilha "CGH SÃO JOÃO (Média Geração)".
 */

import type {
  DadosUsina,
  PremissasEconomicas,
  ParametrosAnalise,
  LinhaFluxoCaixa,
  IndicadoresFinanceiros,
  ResultadosEstudo,
  StatusViabilidade,
} from '../types/studyTypes'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

/** Horas médias por mês (730 h/mês) */
const HORAS_MES = 730

/** Tolerância para convergência da TIR (Newton-Raphson) */
const TIR_TOLERANCIA = 1e-7

/** Máximo de iterações na busca da TIR */
const TIR_MAX_ITER = 1000

// ─────────────────────────────────────────────
// PRODUÇÃO DE ENERGIA
// ─────────────────────────────────────────────

/**
 * Calcula a produção mensal em MWh.
 * Produção Mensal (MWh) = Potência (kW) × Fator Capacidade (%) × 730 h ÷ 1000
 */
export function calcularProducaoMensal(potenciaKw: number, fatorCapacidadePct: number): number {
  return (potenciaKw * (fatorCapacidadePct / 100) * HORAS_MES) / 1000
}

/**
 * Produção anual = produção mensal × número de meses
 */
export function calcularProducaoAnual(producaoMensal: number, meses = 12): number {
  return producaoMensal * meses
}

// ─────────────────────────────────────────────
// TARIFAS E RECEITA
// ─────────────────────────────────────────────

/**
 * Tarifa efetiva de energia (R$/MWh) considerando TE + TUSD fora ponta.
 * Para simplificação do fluxo anual é usada a tarifa fora ponta como base.
 */
export function calcularTarifaEfetiva(
  teFp: number,
  tusdFp: number,
  tusdGeracao: number,
  impostos: PremissasEconomicas['impostos']
): number {
  const base = teFp + tusdFp - tusdGeracao
  const fatorImposto =
    1 -
    (impostos.habPis ? impostos.pis / 100 : 0) -
    (impostos.habCofins ? impostos.cofins / 100 : 0) -
    (impostos.habIcms ? impostos.icms / 100 : 0)
  return base * fatorImposto
}

/**
 * Receita bruta = produção × tarifa base (sem dedução de impostos aqui)
 * Os impostos são calculados separadamente.
 */
export function calcularReceitaBruta(producaoMwh: number, tarifaBase: number): number {
  return producaoMwh * tarifaBase
}

/**
 * Total de impostos sobre a receita
 */
export function calcularImpostos(receita: number, impostos: PremissasEconomicas['impostos']): number {
  let total = 0
  if (impostos.habPis) total += receita * (impostos.pis / 100)
  if (impostos.habCofins) total += receita * (impostos.cofins / 100)
  if (impostos.habIcms) total += receita * (impostos.icms / 100)
  return total
}

// ─────────────────────────────────────────────
// CUSTOS OPERACIONAIS
// ─────────────────────────────────────────────

/**
 * Manutenção = Investimento Total × % manutenção
 */
export function calcularManutencao(investimentoTotal: number, pctManutencao: number): number {
  return investimentoTotal * (pctManutencao / 100)
}

/**
 * Gestão variável = Receita × % gestão variável
 */
export function calcularGestaoVariavel(receita: number, pctGestao: number): number {
  return receita * (pctGestao / 100)
}

/**
 * Gestão fixa = valor mensal × meses, corrigida anualmente pelo IPCA.
 * Ano 0 da correção é o valor base (nenhuma correção); a partir do ano 1 aplica (1+IPCA)^n.
 */
export function calcularGestaoFixa(
  valorMensalBase: number,
  meses: number,
  anoRelativo: number, // 0 = primeiro ano operacional
  ipca: number
): number {
  const fatorIpca = Math.pow(1 + ipca / 100, anoRelativo)
  return valorMensalBase * meses * fatorIpca
}

/**
 * Demanda = tarifa demanda × demanda contratada × meses, corrigida pelo reajuste.
 */
export function calcularDemanda(
  tarifaDemanda: number,
  demandaKw: number,
  meses: number,
  anoRelativo: number,
  reajuste: number
): number {
  const fatorReajuste = Math.pow(1 + reajuste / 100, anoRelativo)
  return tarifaDemanda * demandaKw * meses * fatorReajuste
}

// ─────────────────────────────────────────────
// VPL E TIR
// ─────────────────────────────────────────────

/**
 * Calcula o VPL dado um fluxo de caixa e taxa de desconto.
 * O fluxo deve incluir o investimento no índice 0 (negativo).
 * @param fluxos Array com investimento negativo no índice 0
 * @param taxa Taxa de desconto em decimal (ex: 0.12 para 12%)
 */
export function calcularVPL(fluxos: number[], taxa: number): number {
  return fluxos.reduce((acc, fc, t) => acc + fc / Math.pow(1 + taxa, t), 0)
}

/**
 * Calcula a TIR pelo método de Newton-Raphson com busca binária como fallback.
 * Retorna null se não convergir ou não existir TIR real.
 */
export function calcularTIR(fluxos: number[]): number | null {
  // Verifica se há pelo menos uma mudança de sinal (condição necessária para TIR)
  const primeiroNegativo = fluxos[0] < 0
  const temPositivo = fluxos.slice(1).some((f) => f > 0)
  if (!primeiroNegativo || !temPositivo) return null

  // Tentativas de chute inicial para Newton-Raphson
  const chutesIniciais = [0.1, 0.2, 0.5, 1.0, 0.01, 0.3]

  for (const chuteInicial of chutesIniciais) {
    const resultado = newtonRaphsonTIR(fluxos, chuteInicial)
    if (resultado !== null) return resultado
  }

  // Fallback: busca binária entre -99% e 500%
  return buscaBinariaTIR(fluxos, -0.99, 5.0)
}

function newtonRaphsonTIR(fluxos: number[], chuteInicial: number): number | null {
  let taxa = chuteInicial
  for (let i = 0; i < TIR_MAX_ITER; i++) {
    const vpl = calcularVPL(fluxos, taxa)
    const derivada = fluxos.reduce((acc, fc, t) => acc - (t * fc) / Math.pow(1 + taxa, t + 1), 0)
    if (Math.abs(derivada) < 1e-10) break
    const novaTaxa = taxa - vpl / derivada
    if (Math.abs(novaTaxa - taxa) < TIR_TOLERANCIA) {
      if (novaTaxa > -1) return novaTaxa
    }
    taxa = novaTaxa
    if (taxa <= -1) break
  }
  return null
}

function buscaBinariaTIR(fluxos: number[], min: number, max: number): number | null {
  const vplMin = calcularVPL(fluxos, min)
  const vplMax = calcularVPL(fluxos, max)
  if (vplMin * vplMax > 0) return null
  for (let i = 0; i < TIR_MAX_ITER; i++) {
    const mid = (min + max) / 2
    const vplMid = calcularVPL(fluxos, mid)
    if (Math.abs(vplMid) < TIR_TOLERANCIA) return mid
    if (vplMin * vplMid < 0) max = mid
    else min = mid
  }
  return (min + max) / 2
}

// ─────────────────────────────────────────────
// PAYBACK
// ─────────────────────────────────────────────

/**
 * Payback Simples: período em que o fluxo acumulado muda de negativo para positivo.
 * Retorna anos com interpolação decimal para precisão.
 */
export function calcularPaybackSimples(fluxos: LinhaFluxoCaixa[]): number {
  for (let i = 1; i < fluxos.length; i++) {
    if (fluxos[i].fluxoAcumulado >= 0) {
      const anterior = fluxos[i - 1].fluxoAcumulado
      const atual = fluxos[i].fluxoAcumulado
      const fracao = Math.abs(anterior) / (Math.abs(anterior) + Math.abs(atual))
      return i - 1 + fracao
    }
  }
  return Infinity
}

/**
 * Payback Descontado: mesma lógica porém usando fluxo descontado acumulado.
 */
export function calcularPaybackDescontado(fluxos: LinhaFluxoCaixa[]): number {
  for (let i = 1; i < fluxos.length; i++) {
    if (fluxos[i].fluxoDescontadoAcumulado >= 0) {
      const anterior = fluxos[i - 1].fluxoDescontadoAcumulado
      const atual = fluxos[i].fluxoDescontadoAcumulado
      const fracao = Math.abs(anterior) / (Math.abs(anterior) + Math.abs(atual))
      return i - 1 + fracao
    }
  }
  return Infinity
}

// ─────────────────────────────────────────────
// MOTOR PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Executa o cálculo completo de viabilidade.
 * Retorna o fluxo de caixa linha a linha e todos os indicadores financeiros.
 */
export function calcularViabilidade(
  dadosUsina: DadosUsina,
  premissas: PremissasEconomicas,
  parametros: ParametrosAnalise
): ResultadosEstudo {
  const { financeiras, tarifas, impostos } = premissas
  const { anoInicial, anoFinal, mesesPrimeiroAno } = parametros

  // Investimento total
  const investimentoTotal = dadosUsina.custoUsina + dadosUsina.custoObraRede

  // Produção mensal base (sem reajuste – reajuste é na tarifa)
  const producaoMensal = calcularProducaoMensal(dadosUsina.potencia, dadosUsina.fatorCapacidade)

  // Tarifa base (R$/MWh) = TE FP + TUSD FP - TUSD Geração
  const tarifaBase = tarifas.teFp + tarifas.tusdFp - tarifas.tusdGeracao

  // ────── Linha Ano 0 – Investimento ──────
  const ano0: LinhaFluxoCaixa = {
    ano: anoInicial - 1,
    meses: 0,
    producao: 0,
    receita: 0,
    manutencao: 0,
    gestaoVariavel: 0,
    gestaoFixa: 0,
    demanda: 0,
    impostos: 0,
    totalSaidas: 0,
    fluxoCaixa: -investimentoTotal,
    fluxoAcumulado: -investimentoTotal,
    fluxoDescontado: -investimentoTotal,
    fluxoDescontadoAcumulado: -investimentoTotal,
    rentabilidade: 0,
  }

  const linhas: LinhaFluxoCaixa[] = [ano0]
  const anos = anoFinal - anoInicial + 1

  for (let i = 0; i < anos; i++) {
    const ano = anoInicial + i
    const meses = i === 0 ? mesesPrimeiroAno : 12
    const anoRelativo = i // Para correção de IPCA e reajuste (começa em 0 no primeiro ano operacional)

    // Fator de reajuste tarifário acumulado
    const fatorReajuste = Math.pow(1 + financeiras.reajusteAnual / 100, anoRelativo)

    // Produção e Receita
    const producao = calcularProducaoAnual(producaoMensal, meses)
    const tarifaCorrigida = tarifaBase * fatorReajuste
    const receita = calcularReceitaBruta(producao, tarifaCorrigida)

    // Custos
    const manutencao = calcularManutencao(investimentoTotal, financeiras.manutencao)
    const gestaoVariavel = calcularGestaoVariavel(receita, financeiras.gestaoVariavel)
    const gestaoFixa = calcularGestaoFixa(
      financeiras.gestaoFixaMensal,
      meses,
      anoRelativo,
      financeiras.ipca
    )
    const demanda = calcularDemanda(
      tarifas.tarifaDemanda,
      dadosUsina.demanda,
      meses,
      anoRelativo,
      financeiras.reajusteAnual
    )
    const impostosValor = calcularImpostos(receita, impostos)

    const totalSaidas = manutencao + gestaoVariavel + gestaoFixa + demanda + impostosValor
    const fluxoCaixa = receita - totalSaidas

    // Fluxo acumulado simples
    const anterior = linhas[linhas.length - 1]
    const fluxoAcumulado = anterior.fluxoAcumulado + fluxoCaixa

    // Fluxo descontado pela TMA
    const tma = financeiras.tma / 100
    const fluxoDescontado = fluxoCaixa / Math.pow(1 + tma, i + 1)
    const fluxoDescontadoAcumulado = anterior.fluxoDescontadoAcumulado + fluxoDescontado

    // Rentabilidade do período = fluxo / investimento
    const rentabilidade = (fluxoCaixa / investimentoTotal) * 100

    linhas.push({
      ano,
      meses,
      producao,
      receita,
      manutencao,
      gestaoVariavel,
      gestaoFixa,
      demanda,
      impostos: impostosValor,
      totalSaidas,
      fluxoCaixa,
      fluxoAcumulado,
      fluxoDescontado,
      fluxoDescontadoAcumulado,
      rentabilidade,
    })
  }

  // ─── Indicadores ───
  const fluxosParaTIR = linhas.map((l) => l.fluxoCaixa)

  const tir = calcularTIR(fluxosParaTIR)
  const vpl = calcularVPL(fluxosParaTIR, financeiras.tma / 100)
  const paybackSimples = calcularPaybackSimples(linhas)
  const paybackDescontado = calcularPaybackDescontado(linhas)

  // Médias (excluindo ano 0)
  const linhasOperacionais = linhas.slice(1)
  const producaoAnualMedia =
    linhasOperacionais.reduce((s, l) => s + l.producao, 0) / linhasOperacionais.length
  const receitaMedia =
    linhasOperacionais.reduce((s, l) => s + l.receita, 0) / linhasOperacionais.length
  const fluxoMedio =
    linhasOperacionais.reduce((s, l) => s + l.fluxoCaixa, 0) / linhasOperacionais.length

  // Viabilidade: VPL > 0 E TIR > TMA
  let viabilidade: StatusViabilidade = 'INDEFINIDO'
  if (tir !== null) {
    viabilidade = vpl > 0 && tir * 100 > financeiras.tma ? 'VIÁVEL' : 'NÃO VIÁVEL'
  }

  const indicadores: IndicadoresFinanceiros = {
    vpl,
    tir: tir !== null ? tir * 100 : 0,
    paybackSimples,
    paybackDescontado,
    investimentoTotal,
    investimentoKw: dadosUsina.potencia > 0 ? investimentoTotal / dadosUsina.potencia : 0,
    producaoAnualMedia,
    receitaMedia,
    fluxoMedio,
    viabilidade,
  }

  return { indicadores, fluxoCaixa: linhas }
}

// ─────────────────────────────────────────────
// UTILITÁRIOS DE FORMATAÇÃO
// ─────────────────────────────────────────────

/** Formata valor em reais (R$) */
export function formatBRL(value: number, casas = 2): string {
  if (!isFinite(value)) return '—'
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

/** Formata percentual */
export function formatPct(value: number, casas = 2): string {
  if (!isFinite(value)) return '—'
  return `${value.toFixed(casas)}%`
}

/** Formata MWh */
export function formatMWh(value: number): string {
  if (!isFinite(value)) return '—'
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MWh`
}

/** Formata payback em anos e meses */
export function formatPayback(anos: number): string {
  if (!isFinite(anos) || anos === Infinity) return '> período de análise'
  const anosInteiros = Math.floor(anos)
  const mesesDecimais = Math.round((anos - anosInteiros) * 12)
  if (mesesDecimais === 0) return `${anosInteiros} anos`
  return `${anosInteiros} anos e ${mesesDecimais} meses`
}
