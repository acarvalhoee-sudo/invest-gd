/**
 * results.ts — Tipos dos resultados financeiros (Fase 2 — Motor Planilha)
 */

/** Uma linha da tabela anual */
export interface AnoRow {
  ano:                        number   // 0 = CAPEX, 1..N = operação
  meses:                      number   // 0 para ano 0, mesesPrimeiroAno para ano 1, 12 demais
  geracao:                    number   // MWh
  receitaBruta:               number   // R$
  tributos:                   number   // R$ (Imposto = tributosReceita% × receita)
  receitaLiquida:             number   // R$ (receitaBruta − tributos)
  opDemanda:                  number   // R$ (TUSD G × gross-up × kW × meses)
  opOperacao:                 number   // R$
  opManutencao:               number   // R$
  opSeguro:                   number   // R$
  opGestao:                   number   // R$ (variável: % receita bruta)
  opArrendamento:             number   // R$
  opFixoGestao:               number   // R$ (fixo mensal com IPCA)
  opexTotal:                  number   // R$ (soma de todos os itens OPEX, sem tributos)
  ebitda:                     number   // R$ (receitaLiquida − opexTotal = fluxo operacional)
  fluxo:                      number   // R$ (ano 0 negativo = −CAPEX)
  fluxoAcumulado:             number   // R$
  fluxoDescontado:            number   // R$
  fluxoDescontadoAcumulado:   number   // R$
}

/** Indicadores-resumo do estudo */
export interface ResultadosFinanceiros {
  tabela:              AnoRow[]
  geracaoMediaMensal:  number           // MWh/mês
  receitaAnual:        number           // Receita bruta do Ano 1 (R$)
  ebitdaAnual:         number           // Rec. Líquida do Ano 1 (R$)
  capex:               number           // R$
  vpl:                 number           // R$ (valor presente líquido — estilo Excel NPV)
  tir:                 number | null    // % a.a. (null se não convergir)
  paybackSimples:      number | null    // anos (null se não atingir)
  paybackDescontado:   number | null    // anos (null se não atingir)
  calculadoEm:         string           // ISO timestamp
}
