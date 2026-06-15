/**
 * scenario.ts — Tipos para o módulo de Cenários (FASE 04)
 */
import type { Opex, Tributos } from '@/types/study'

/** Parâmetros editáveis de um cenário (sobrescrevem o estudo base) */
export interface ScenarioParams {
  // Tarifas
  tarifaVenda:       number   // R$/MWh
  tusdG:             number   // R$/kW/mês
  reajusteAnual:     number   // % a.a.
  // Ativo
  fatorCapacidade:   number   // %
  // CAPEX
  capexTotal:        number   // R$
  // OPEX (% sobre CAPEX exceto arrendamento e fixoGestao que são R$/mês)
  opexOperacao:      number
  opexManutencao:    number
  opexSeguro:        number
  opexGestao:        number
  opexArrendamento:  number   // R$/mês
  opexFixoGestao:    number   // R$/mês
  // Tributos
  tributosReceita:   number   // %
  pis:               number   // %
  cofins:            number   // %
  icms:              number   // %
  // Premissas financeiras
  tma:               number   // % a.a.
  selic:             number   // % a.a.
  ipca:              number   // % a.a.
  vidaUtil:          number   // anos
}

/** Resultados calculados de um cenário */
export interface ScenarioResults {
  vpl:                number
  tir:                number | null
  paybackSimples:     number | null
  paybackDescontado:  number | null
  receitaBrutaAno1:   number
  receitaLiquidaAno1: number
  receitaAcumulada:   number
  ebitdaAcumulado:    number
  capex:              number
  geracaoAnual:       number
  calculadoEm:        string
}

/** Documento Firestore na coleção "scenarios" */
export interface Scenario {
  id?:       string
  studyId:   string
  name:      string
  params:    ScenarioParams
  results?:  ScenarioResults
  createdAt: string
  updatedAt: string
}

/** Monta ScenarioParams a partir dos dados de um estudo */
export function paramsFromStudy(study: {
  tarifas:              { tarifaVenda: number; tusdG: number; reajusteAnual: number }
  ativo:                { fatorCapacidade: number }
  capex:                { total: number }
  opex:                 Opex
  tributos:             Tributos
  premissasFinanceiras: { tma: number; selic: number; inflacao: number; vidaUtil: number }
}): ScenarioParams {
  return {
    tarifaVenda:      study.tarifas.tarifaVenda,
    tusdG:            study.tarifas.tusdG,
    reajusteAnual:    study.tarifas.reajusteAnual,
    fatorCapacidade:  study.ativo.fatorCapacidade,
    capexTotal:       study.capex.total,
    opexOperacao:     study.opex.operacao,
    opexManutencao:   study.opex.manutencao,
    opexSeguro:       study.opex.seguro,
    opexGestao:       study.opex.gestao,
    opexArrendamento: study.opex.arrendamento,
    opexFixoGestao:   study.opex.fixoGestao,
    tributosReceita:  study.tributos.tributosReceita,
    pis:              study.tributos.pis,
    cofins:           study.tributos.cofins,
    icms:             study.tributos.icms,
    tma:              study.premissasFinanceiras.tma,
    selic:            study.premissasFinanceiras.selic,
    ipca:             study.premissasFinanceiras.inflacao,
    vidaUtil:         study.premissasFinanceiras.vidaUtil,
  }
}
