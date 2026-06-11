/**
 * study.ts — Tipos centrais do sistema INVEST GD
 * Fase 1: estrutura de dados + CRUD Firestore
 */

// ─── Enums ─────────────────────────────────────────────────────

export type FonteGeracao = 'solar' | 'cgh' | 'pch' | 'eolica'
export type TipoGD       = 'GD I' | 'GD II' | 'GD III'

// ─── Aba 01 — Dados da Usina ────────────────────────────────────

export interface DadosUsina {
  nomeEstudo:        string
  nomeUsina:         string
  fonte:             FonteGeracao
  /** kW ou kWp (solar) */
  potencia:          number
  custoUsina:        number
  custoObraRede:     number
  /** Calculado: custoUsina + custoObraRede */
  investimentoTotal: number
  demanda:           number
  fatorCapacidade:   number
  consumoAnualUG:    number
  tipoGD:            TipoGD
  degradacaoAnual:   number
  disponibilidade:   number
  perdasEletricas:   number
}

// ─── Aba 02 — Premissas ─────────────────────────────────────────

export interface Tarifas {
  te:           number   // R$/MWh — Tarifa de Energia
  tusd:         number   // R$/MWh — TUSD
  tusdGeracao:  number   // R$/MWh — TUSD Geração
  demanda:      number   // R$/kW  — Tarifa Demanda
}

export interface Impostos {
  pis:    number   // %
  cofins: number   // %
  icms:   number   // %
}

export interface PremissasFinanceiras {
  reajusteAnual: number   // %
  ipca:          number   // %
  selic:         number   // %
  tma:           number   // %
}

export interface Custos {
  manutencao:       number   // % do investimento
  gestao:           number   // % da receita
  seguro:           number   // % do investimento
  arrendamento:     number   // R$/ano
  gestaoFixaMensal: number   // R$/mês
}

export interface Premissas {
  tarifas:     Tarifas
  impostos:    Impostos
  financeiras: PremissasFinanceiras
  custos:      Custos
}

// ─── Aba 03 — Parâmetros ────────────────────────────────────────

export interface ParametrosAnalise {
  anoInicial:        number
  anoFinal:          number
  mesesPrimeiroAno:  number
}

// ─── Estudo completo ────────────────────────────────────────────

export interface Study {
  id?:          string
  dadosUsina:   DadosUsina
  premissas:    Premissas
  parametros:   ParametrosAnalise
  criadoEm:     string   // ISO string
  atualizadoEm: string   // ISO string
}

// ─── Defaults ───────────────────────────────────────────────────

export const STUDY_DEFAULTS: Omit<Study, 'id' | 'criadoEm' | 'atualizadoEm'> = {
  dadosUsina: {
    nomeEstudo:        '',
    nomeUsina:         '',
    fonte:             'cgh',
    potencia:          0,
    custoUsina:        0,
    custoObraRede:     0,
    investimentoTotal: 0,
    demanda:           0,
    fatorCapacidade:   35,
    consumoAnualUG:    0,
    tipoGD:            'GD I',
    degradacaoAnual:   0.5,
    disponibilidade:   98,
    perdasEletricas:   2,
  },
  premissas: {
    tarifas: {
      te:          350,
      tusd:        220,
      tusdGeracao: 12,
      demanda:     35,
    },
    impostos: {
      pis:    0.65,
      cofins: 3.0,
      icms:   0,
    },
    financeiras: {
      reajusteAnual: 6.0,
      ipca:          4.5,
      selic:         10.5,
      tma:           12.0,
    },
    custos: {
      manutencao:       1.0,
      gestao:           5.0,
      seguro:           0.5,
      arrendamento:     0,
      gestaoFixaMensal: 500,
    },
  },
  parametros: {
    anoInicial:       new Date().getFullYear(),
    anoFinal:         new Date().getFullYear() + 19,
    mesesPrimeiroAno: 12,
  },
}

// ─── Helpers ────────────────────────────────────────────────────

export const FONTE_LABELS: Record<FonteGeracao, string> = {
  solar:  'Solar (UFV)',
  cgh:    'CGH',
  pch:    'PCH',
  eolica: 'Eólica',
}

export const FONTE_ICONS: Record<FonteGeracao, string> = {
  solar:  '☀️',
  cgh:    '💧',
  pch:    '🌊',
  eolica: '💨',
}

export type FonteBadgeVariant = 'solar' | 'cgh' | 'pch' | 'eolica'
