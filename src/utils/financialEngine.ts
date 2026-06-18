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
 * OPERAÇÃO (% anual do CAPEX):
 *   Ano 1:  capex × pct × (meses/12)            proporcional, sem IPCA
 *   Ano N:  capex × pct × (1 + (N−1) × IPCA)   reajuste linear a partir do Ano 2
 *   Exemplo: CAPEX=10M, 1%, IPCA=5%
 *     Ano 2 = 10M × 1% × 1,05 = R$105.000
 *     Ano 3 = 10M × 1% × 1,10 = R$110.000
 *
 * SEGURO (% anual do CAPEX — mesmo padrão que OPERAÇÃO e MANUTENÇÃO):
 *   Ano 1:  capex × pct × (meses/12)
 *   Ano N:  capex × pct × (1 + (N−1) × IPCA)
 *
 * IMPOSTO (Tributos):
 *   = receita × tributosReceita%   → item de SAÍDA (não deduzido da receita no cálculo)
 *   Para manter compatibilidade com UI: receitaLiquida = receita − tributos,
 *   ebitda = receitaLiquida − opexTotal  (mesmo resultado final que planilha)
 *
 * VPL (estilo Excel NPV):
 *   VPL = somatorio fluxo[t] / (1+TMA)^(t+1)  para t=0..N
 *
 * PAYBACK DESCONTADO:
 *   Ano 0: fluxoDescontadoAcumulado = −CAPEX  (t=0, fator=(1+TMA)^0=1)
 *   Ano N: fluxoDesc = fluxo / (1+TMA)^N ; acumula até >= 0
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
/* VPL — estilo Excel NPV (todos os fluxos descontados t+1 periodos)  */
/* ------------------------------------------------------------------ */

export function calcVPL(fluxos: number[], tmaPercent: number): number {
  const r = tmaPercent / 100
  // Excel NPV: cada fluxo[t] descontado a (t+1) periodos
  return fluxos.reduce((acc, fc, t) => acc + fc / Math.pow(1 + r, t + 1), 0)
}

/* ------------------------------------------------------------------ */
/* Motor principal                                                      */
/* ------------------------------------------------------------------ */

export function calcResultados(study: Study): ResultadosFinanceiros {
  const { ativo, tarifas, tributos, capex, opex, premissasFinanceiras: pf } = study

  /* -- Parametros base -- */
  const capexTotal     = capex.total
  const tarifaBase     = tarifas.tarifaVenda           // R$/MWh
  const reajuste       = tarifas.reajusteAnual / 100   // decimal (linear)
  const ipca           = pf.inflacao / 100             // decimal (IPCA p/ OPEX)
  const tma            = pf.tma                        // % a.a.
  const vidaUtil       = pf.vidaUtil
  const mesesAno1      = pf.mesesPrimeiroAno

  /* -- Aliquotas -- */
  const tributosRec    = tributos.tributosReceita / 100
  const pis            = tributos.pis    / 100
  const cofins         = tributos.cofins / 100

  /* -- Geracao e energia compensavel --
     Energia compensavel = geracao total - consumo proprio da UG
     consumoAnualUG em MWh/ano → dividir por 12 para mensal.
     Proteger contra negativo com Math.max(0, ...).
  */
  const geracaoMensal      = ativo.potencia * (ativo.fatorCapacidade / 100) * 730 / 1000
  const geracaoAnual       = geracaoMensal * 12
  const consumoMensalUG    = (ativo.consumoAnualUG ?? 0) / 12
  const energiaCompMensal  = Math.max(0, geracaoMensal - consumoMensalUG)  // MWh/mes
  const energiaCompAnual   = energiaCompMensal * 12

  /* -- OPEX rates -- */
  const pctOperacao   = opex.operacao   / 100
  const pctManutencao = opex.manutencao / 100
  const pctSeguro     = opex.seguro     / 100
  const pctGestao     = opex.gestao     / 100
  const arrendamento  = opex.arrendamento   // R$/mes
  const fixoGestao    = opex.fixoGestao     // R$/mes

  /* -- Demanda (TUSD G com gross-up PIS+COFINS) -- */
  const denominador   = 1 - pis - cofins
  const grossUpFactor = denominador > 0.01 ? 1 / denominador : 1
  const demandaBase   = ativo.demanda * tarifas.tusdG * grossUpFactor // R$/mes sem reajuste

  /* -- Tabela -- */
  const tabela: AnoRow[] = []
  let fluxoAcum     = 0
  let fluxoDescAcum = 0
  const fluxosBrutos: number[] = []

  /* -- Ano 0 — CAPEX --
     O CAPEX e desembolsado em t=0:
     fluxoDescontado = -CAPEX / (1+TMA)^0 = -CAPEX
     Portanto fluxoDescAcum inicia em -CAPEX para que o payback
     descontado seja calculado corretamente (>= payback simples).
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
    const prevAno = ano - 1  // N-1, usado como multiplicador do IPCA/reajuste

    /* -- RECEITA (crescimento LINEAR pelo reajuste tarifario) --
       Ano 1: energiaCompMensal x meses x tarifa  (sem reajuste)
       Ano N: energiaCompAnual  x tarifa x (1 + (N-1) x reajuste)  [LINEAR]
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

    /* -- Imposto (Tributos sobre Receita Bruta) -- */
    const trib       = receitaBruta * tributosRec
    const receitaLiq = receitaBruta - trib

    /* -- DEMANDA (TUSD G)
       Ano 1: demandaBase x meses            (prevAno=0 → sem reajuste)
       Ano N: demandaBase x 12 x (1 + prevAno x reajuste)
    */
    let opDemanda: number
    if (ano === 1) {
      opDemanda = demandaBase * meses
    } else {
      opDemanda = demandaBase * 12 * (1 + prevAno * reajuste)
    }

    /* -- MANUTENCAO
       Ano 1: capex x pct x (meses/12)
       Ano N: capex x pct x (1 + IPCA x prevAno)
         Ano 2: capex x pct x (1 + 1 x IPCA)
         Ano 3: capex x pct x (1 + 2 x IPCA)
    */
    let opManutencao: number
    if (ano === 1) {
      opManutencao = capexTotal * pctManutencao * (meses / 12)
    } else {
      opManutencao = capexTotal * pctManutencao * (1 + ipca * prevAno)
    }

    /* -- GESTAO variavel + fixo
       Variavel: sempre % da receita bruta vigente (nao tem IPCA direto)
       Fixo Ano 1: fixoGestao x meses
       Fixo Ano N: fixoGestao x 12 x (1 + IPCA x prevAno)
    */
    const opGestao = receitaBruta * pctGestao
    let opFixoGestao: number
    if (ano === 1) {
      opFixoGestao = fixoGestao * meses
    } else {
      opFixoGestao = fixoGestao * 12 * (1 + ipca * prevAno)
    }

    /* -- ARRENDAMENTO
       Ano 1: arrendamento x meses
       Ano N: arrendamento x 12 x (1 + IPCA x prevAno)
         Ano 2: arr x 12 x (1 + 1 x IPCA)
         Ano 3: arr x 12 x (1 + 2 x IPCA)
    */
    let opArrendamento: number
    if (ano === 1) {
      opArrendamento = arrendamento * meses
    } else {
      opArrendamento = arrendamento * 12 * (1 + ipca * prevAno)
    }

    /* -- OPERACAO (% anual do CAPEX)
       Ano 1: capex x pct x (meses/12)             proporcional, sem IPCA
       Ano N: capex x pct x (1 + prevAno x IPCA)   reajuste linear igual a Manutencao
         Ano 2 = capex x pct x (1 + 1 x IPCA)
         Ano 3 = capex x pct x (1 + 2 x IPCA)
         Ano 4 = capex x pct x (1 + 3 x IPCA)
    */
    let opOperacao: number
    if (ano === 1) {
      opOperacao = capexTotal * pctOperacao * (meses / 12)
    } else {
      opOperacao = capexTotal * pctOperacao * (1 + ipca * prevAno)
    }

    /* -- SEGURO (% anual do CAPEX — mesmo padrao que OPERACAO e MANUTENCAO)
       Ano 1: capex x pct x (meses/12)
       Ano N: capex x pct x (1 + prevAno x IPCA)
    */
    let opSeguro: number
    if (ano === 1) {
      opSeguro = capexTotal * pctSeguro * (meses / 12)
    } else {
      opSeguro = capexTotal * pctSeguro * (1 + ipca * prevAno)
    }

    /* -- OPEX Total (exclui tributos — tratados separadamente) -- */
    const opexTotal =
      opDemanda + opManutencao + opGestao + opFixoGestao +
      opArrendamento + opOperacao + opSeguro

    /* -- Receita Liquida (= Rec.Bruta - Tributos - OPEX) -- */
    const ebitda = receitaLiq - opexTotal
    const fluxo  = ebitda

    fluxoAcum += fluxo

    /* -- Fluxo Descontado para Payback Descontado --
       fluxoDesc = fluxo / (1 + TMA)^ano
       Acumula sobre fluxoDescAcum que ja parte de -CAPEX (Ano 0)
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

  /* -- VPL (estilo Excel NPV — todos os fluxos descontados t+1 periodos) -- */
  const vpl = calcVPL(fluxosBrutos, tma)

  /* -- TIR -- */
  const tir = calcTIR(fluxosBrutos)

  /* -- Payback Simples --
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

  /* -- Payback Descontado --
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
