/**
 * financialEngine.ts — Motor financeiro baseado na planilha oficial
 * "MOTOR DE CALCULO USINAS GD.xlsx"
 *
 * Fórmulas implementadas (mapeamento Excel → TypeScript):
 *
 * RECEITA:
 *   Base: energia compensável = geração total − consumo próprio da UG
 *   Ano 1:  energiaCompMensal × meses × tarifaVenda
 *   Ano N:  energiaCompAnual × tarifaVenda × (1 + (N−1) × reajuste)   [LINEAR]
 *
 * DEMANDA (TUSD G):
 *   grossUp = 1 / (1 − PIS% − COFINS%)
 *   Ano 1:  demanda_kW × tusdG × grossUp × meses
 *   Ano N:  demanda_kW × tusdG × grossUp × 12 × (1 + (N−1) × reajuste)
 *
 * MANUTENÇÃO:
 *   Ano 1:  capex × pct × meses/12
 *   Ano N:  capex × pct × (1 + IPCA × (N−1))
 *
 * GESTÃO (variável + fixo):
 *   Variável: receita × pctGestao  (sem IPCA — sempre % da receita vigente)
 *   Fixo Ano 1:  fixoGestao × meses
 *   Fixo Ano N:  fixoGestao × 12 × (1 + IPCA × (N−1))
 *
 * ARRENDAMENTO:
 *   Ano 1:  arrendamento × meses
 *   Ano N:  arrendamento × 12 × (1 + IPCA × (N−1))
 *
 * OPERAÇÃO (taxa mensal armazenada; ×12 para anos cheios):
 *   Ano 1:  capex × pct × meses × (meses/12)   = capex × pct × meses²/12
 *   Ano N:  capex × pct × (1 + IPCA × max(0, N−2)) × 12  ← IPCA defasado 1 ano
 *
 * SEGURO (mesmo padrão mensal que OPERAÇÃO):
 *   Ano 1:  capex × pct × meses   (taxa mensal × nº de meses, sem /12)
 *   Ano N:  capex × pct × (1 + IPCA × max(0, N−2)) × 12
 *
 * IMPOSTO (Tributos):
 *   = receita × tributosReceita%   → item de SAÍDA (não deduzido da receita no cálculo)
 *   Para manter compatibilidade com UI: receitaLiquida = receita − tributos,
 *   ebitda = receitaLiquida − opexTotal  (mesmo resultado final que planilha)
 *
 * VPL (estilo Excel NPV):
 *   VPL = Σ fluxo[t] / (1+TMA)^(t+1)  para t=0..N  (todos os fluxos descontados 1 período extra)
 *
 * PAYBACK DESCONTADO:
 *   Ano 0: fluxoDescontadoAcumulado = −CAPEX  (t=0, fator=(1+TMA)^0=1)
 *   Ano N: fluxoDesc = fluxo / (1+TMA)^N ; acumula até ≥ 0
 *
 * TIR: Newton-Raphson sobre fluxos padrão (resultado idêntico)
 */

import type { Study } from '@/types/study'
import type { AnoRow, ResultadosFinanceiros } from '@/types/results'

/* ------------------------------------------------------------------ */
/* TIR — Newton-Raphson                                                */
/* ------------------------------------------------------------------ */

function npvAtRate(fluxos: number[], taxa: number): number {
  return fluxos.reduce((acc, fc, i) => acc + fc / Math.pow(1 + taxa, i), 0)
}

function dnpvAtRate(fluxos: number[], taxa: number): number {
  return fluxos.reduce(
    (acc, fc, i) => acc - (i * fc) / Math.pow(1 + taxa, i + 1),
    0,
  )
}

export function calcTIR(fluxos: number[], maxIter = 1000, tol = 1e-8): number | null {
  const temNeg = fluxos.some((f) => f < 0)
  const temPos = fluxos.some((f) => f > 0)
  if (!temNeg || !temPos) return null

  let taxa = 0.1
  for (let i = 0; i < maxIter; i++) {
    const npv  = npvAtRate(fluxos, taxa)
    const dnpv = dnpvAtRate(fluxos, taxa)
    if (Math.abs(dnpv) < 1e-14) break
    const novaTaxa = taxa - npv / dnpv
    if (Math.abs(novaTaxa - taxa) < tol) return novaTaxa * 100
    taxa = novaTaxa
    if (taxa < -0.9999) taxa = -0.9999
    if (taxa > 100)     taxa = 100
  }
  return taxa * 100
}

/* ------------------------------------------------------------------ */
/* VPL — estilo Excel NPV (todos os fluxos descontados t+1 períodos)  */
/* ------------------------------------------------------------------ */

export function calcVPL(fluxos: number[], tmaPercent: number): number {
  const r = tmaPercent / 100
  // Excel NPV: cada fluxo[t] descontado a (t+1) períodos
  return fluxos.reduce((acc, fc, t) => acc + fc / Math.pow(1 + r, t + 1), 0)
}

/* ------------------------------------------------------------------ */
/* Motor principal                                                      */
/* ------------------------------------------------------------------ */

export function calcResultados(study: Study): ResultadosFinanceiros {
  const { ativo, tarifas, tributos, capex, opex, premissasFinanceiras: pf } = study

  /* ── Parâmetros base ── */
  const capexTotal     = capex.total
  const tarifaBase     = tarifas.tarifaVenda           // R$/MWh
  const reajuste       = tarifas.reajusteAnual / 100   // decimal (linear)
  const ipca           = pf.inflacao / 100             // decimal (IPCA p/ OPEX)
  const tma            = pf.tma                        // % a.a.
  const vidaUtil       = pf.vidaUtil
  const mesesAno1      = pf.mesesPrimeiroAno

  /* ── Alíquotas ── */
  const tributosRec    = tributos.tributosReceita / 100
  const pis            = tributos.pis    / 100
  const cofins         = tributos.cofins / 100

  /* ── Geração e energia compensável ──
     Energia compensável = geração total − consumo próprio da UG
     consumoAnualUG em MWh/ano → dividir por 12 para mensal.
     Proteger contra negativo com Math.max(0, ...).
  */
  const geracaoMensal      = ativo.potencia * (ativo.fatorCapacidade / 100) * 730 / 1000
  const geracaoAnual       = geracaoMensal * 12
  const consumoMensalUG    = (ativo.consumoAnualUG ?? 0) / 12
  const energiaCompMensal  = Math.max(0, geracaoMensal - consumoMensalUG)  // MWh/mês
  const energiaCompAnual   = energiaCompMensal * 12

  /* ── OPEX rates ── */
  const pctOperacao   = opex.operacao   / 100
  const pctManutencao = opex.manutencao / 100
  const pctSeguro     = opex.seguro     / 100
  const pctGestao     = opex.gestao     / 100
  const arrendamento  = opex.arrendamento   // R$/mês
  const fixoGestao    = opex.fixoGestao     // R$/mês

  /* ── Demanda (TUSD G com gross-up PIS+COFINS) ── */
  const denominador   = 1 - pis - cofins
  const grossUpFactor = denominador > 0.01 ? 1 / denominador : 1
  const demandaBase   = ativo.demanda * tarifas.tusdG * grossUpFactor // R$/mês sem reajuste

  /* ── Tabela ── */
  const tabela: AnoRow[] = []
  let fluxoAcum     = 0
  let fluxoDescAcum = 0
  const fluxosBrutos: number[] = []

  /* ── Ano 0 — CAPEX ──
     O CAPEX é desembolsado em t=0:
     fluxoDescontado = −CAPEX / (1+TMA)^0 = −CAPEX
     Portanto fluxoDescAcum inicia em −CAPEX para que o payback
     descontado seja calculado corretamente (≥ payback simples).
  */
  const rowAno0: AnoRow = {
    ano: 0, meses: 0,
    geracao: 0, receitaBruta: 0, tributos: 0, receitaLiquida: 0,
    opDemanda: 0, opOperacao: 0, opManutencao: 0, opSeguro: 0,
    opGestao: 0, opArrendamento: 0, opFixoGestao: 0, opexTotal: 0,
    ebitda: 0,
    fluxo: -capexTotal,
    fluxoAcumulado:           -capexTotal,
    fluxoDescontado:          -capexTotal,
    fluxoDescontadoAcumulado: -capexTotal,
  }
  fluxoAcum     = -capexTotal
  fluxoDescAcum = -capexTotal
  fluxosBrutos.push(-capexTotal)
  tabela.push(rowAno0)

  let receitaAnual1 = 0
  let ebitdaAnual1  = 0

  for (let ano = 1; ano <= vidaUtil; ano++) {
    const meses   = ano === 1 ? mesesAno1 : 12
    const prevAno = ano - 1  // equivalente a C(linha_anterior) na planilha

    /* ── Receita (crescimento LINEAR pelo reajuste tarifário) ──
       Base: energia compensável = geração − consumo próprio UG
       Ano 1: energiaCompMensal × meses × tarifa  (sem reajuste)
       Ano N: energiaCompAnual  × tarifa × (1 + (N−1) × reajuste)  [LINEAR]
    */
    let receitaBruta: number
    let geracao: number
    if (ano === 1) {
      geracao      = energiaCompMensal * meses
      receitaBruta = energiaCompMensal * meses * tarifaBase
    } else {
      geracao      = energiaCompAnual
      receitaBruta = energiaCompAnual * tarifaBase * (1 + prevAno * reajuste)
    }

    /* ── Imposto (Tributos sobre Receita Bruta) ── */
    const trib       = receitaBruta * tributosRec
    const receitaLiq = receitaBruta - trib

    /* ── DEMANDA (TUSD G)
       Ano 1: demandaBase × meses            (prevAno=0 → sem reajuste)
       Ano N: demandaBase × 12 × (1 + prevAno × reajuste)
    */
    let opDemanda: number
    if (ano === 1) {
      opDemanda = demandaBase * meses
    } else {
      opDemanda = demandaBase * 12 * (1 + prevAno * reajuste)
    }

    /* ── MANUTENÇÃO
       Ano 1: capex × pct × meses/12
       Ano N: capex × pct × (1 + IPCA × prevAno)
    */
    let opManutencao: number
    if (ano === 1) {
      opManutencao = capexTotal * pctManutencao * (meses / 12)
    } else {
      opManutencao = capexTotal * pctManutencao * (1 + ipca * prevAno)
    }

    /* ── GESTÃO variável + fixo
       Variável: sempre % da receita bruta vigente
       Fixo Ano 1: fixoGestao × meses
       Fixo Ano N: fixoGestao × 12 × (1 + IPCA × prevAno)
    */
    const opGestao = receitaBruta * pctGestao
    let opFixoGestao: number
    if (ano === 1) {
      opFixoGestao = fixoGestao * meses
    } else {
      opFixoGestao = fixoGestao * 12 * (1 + ipca * prevAno)
    }

    /* ── ARRENDAMENTO
       Ano 1: arrendamento × meses
       Ano N: arrendamento × 12 × (1 + IPCA × prevAno)
    */
    let opArrendamento: number
    if (ano === 1) {
      opArrendamento = arrendamento * meses
    } else {
      opArrendamento = arrendamento * 12 * (1 + ipca * prevAno)
    }

    /* ── OPERAÇÃO (taxa mensal armazenada; planilha usa ×12 para anos cheios)
       Ano 1: capex × pct × meses × (meses/12)   = capex × pct × meses²/12
       Ano N: capex × pct × (1 + IPCA × max(0, N−2)) × 12  ← IPCA defasado 1 ano
    */
    let opOperacao: number
    if (ano === 1) {
      opOperacao = capexTotal * pctOperacao * meses * (meses / 12)
    } else {
      opOperacao = capexTotal * pctOperacao * (1 + ipca * Math.max(0, ano - 2)) * 12
    }

    /* ── SEGURO (mesmo padrão mensal que OPERAÇÃO)
       Ano 1: capex × pct × meses   (taxa mensal × nº de meses, sem /12)
       Ano N: capex × pct × (1 + IPCA × max(0, N−2)) × 12
    */
    let opSeguro: number
    if (ano === 1) {
      opSeguro = capexTotal * pctSeguro * meses
    } else {
      opSeguro = capexTotal * pctSeguro * (1 + ipca * Math.max(0, ano - 2)) * 12
    }

    /* ── OPEX Total (exclui tributos — tratados separadamente) ── */
    const opexTotal =
      opDemanda + opManutencao + opGestao + opFixoGestao +
      opArrendamento + opOperacao + opSeguro

    /* ── Receita Líquida (= Rec.Bruta − Tributos − OPEX) ── */
    const ebitda = receitaLiq - opexTotal
    const fluxo  = ebitda

    fluxoAcum += fluxo

    /* ── Fluxo Descontado para Payback Descontado ──
       fluxoDesc = fluxo / (1 + TMA)^ano
       Acumula sobre fluxoDescAcum que já parte de −CAPEX (Ano 0)
    */
    const fatorDesc   = Math.pow(1 + tma / 100, ano)
    const fluxoDesc   = fluxo / fatorDesc
    fluxoDescAcum    += fluxoDesc

    tabela.push({
      ano, meses, geracao,
      receitaBruta, tributos: trib, receitaLiquida: receitaLiq,
      opDemanda, opOperacao, opManutencao, opSeguro,
      opGestao, opArrendamento, opFixoGestao, opexTotal,
      ebitda, fluxo,
      fluxoAcumulado:           fluxoAcum,
      fluxoDescontado:          fluxoDesc,
      fluxoDescontadoAcumulado: fluxoDescAcum,
    })
    fluxosBrutos.push(fluxo)

    if (ano === 1) {
      receitaAnual1 = receitaBruta
      ebitdaAnual1  = ebitda
    }
  }

  /* ── VPL (estilo Excel NPV — todos os fluxos descontados t+1 períodos) ── */
  const vpl = calcVPL(fluxosBrutos, tma)

  /* ── TIR ── */
  const tir = calcTIR(fluxosBrutos)

  /* ── Payback Simples ──
     Primeiro ano em que o fluxo acumulado (sem desconto) cruza zero.
  */
  let paybackSimples: number | null = null
  for (const row of tabela) {
    if (row.ano > 0 && row.fluxoAcumulado >= 0) {
      const prev = tabela[row.ano - 1]
      if (prev.fluxoAcumulado < 0) {
        const frac = -prev.fluxoAcumulado / (row.fluxoAcumulado - prev.fluxoAcumulado)
        paybackSimples = (row.ano - 1) + frac
      } else {
        paybackSimples = row.ano
      }
      break
    }
  }

  /* ── Payback Descontado ──
     Primeiro ano em que o fluxo descontado acumulado cruza zero.
     Sempre >= paybackSimples porque os fluxos descontados crescem mais
     lentamente do que os fluxos nominais.
  */
  let paybackDescontado: number | null = null
  for (const row of tabela) {
    if (row.ano > 0 && row.fluxoDescontadoAcumulado >= 0) {
      const prev = tabela[row.ano - 1]
      if (prev.fluxoDescontadoAcumulado < 0) {
        const frac = -prev.fluxoDescontadoAcumulado /
          (row.fluxoDescontadoAcumulado - prev.fluxoDescontadoAcumulado)
        paybackDescontado = (row.ano - 1) + frac
      } else {
        paybackDescontado = row.ano
      }
      break
    }
  }

  return {
    tabela,
    geracaoMediaMensal: geracaoMensal,
    receitaAnual:       receitaAnual1,
    ebitdaAnual:        ebitdaAnual1,
    capex:              capexTotal,
    vpl, tir,
    paybackSimples, paybackDescontado,
    calculadoEm: new Date().toISOString(),
  }
}
