/**
 * study.ts - Tipos da Fase 1.1
 * Mantem compatibilidade retroativa com estudos da Fase 1.
 */

// --- Enums ---

export type FonteGeracao = 'ufv' | 'cgh' | 'pch' | 'eolica' | 'biomassa' | 'biogas' | 'outros' | 'solar'
export type TipoGD = 'GD I' | 'GD II' | 'GD III'
export type TipoAquisicao = 'compra_ativo' | 'greenfield'

export const FONTE_LABELS: Record<FonteGeracao, string> = {
  ufv:      'UFV',
  solar:    'UFV',
  cgh:      'CGH',
  pch:      'PCH',
  eolica:   'Eolica',
  biomassa: 'Biomassa',
  biogas:   'Biogas',
  outros:   'Outros',
}

// --- Estruturas Fase 1.1 ---

export interface Ativo {
  nomeEstudo:     string
  nomeUsina:      string
  tipoAquisicao:  TipoAquisicao
  fonte:          FonteGeracao
  potencia:       number
  tipoGD:         TipoGD
  fatorCapacidade:number
  demanda:        number
  consumoAnualUG: number
}

export interface Tarifas {
  tusdG:       number
  tarifaVenda: number
}

export interface Tributos {
  aliquota: number
}

export interface Capex {
  usina:           number
  obraRede:        number
  engenharia:      number
  licenciamento:   number
  comissionamento: number
  contingencia:    number
  total:           number
}

export interface Opex {
  operacao:    number
  manutencao:  number
  seguro:      number
  gestao:      number
  arrendamento:number
}

export interface Reinvestimento {
  id:        string
  ano:       number
  descricao: string
  valor:     number
}

export interface PremissasFinanceiras {
  vidaUtil: number
  tma:      number
  selic:    number
  inflacao: number
}

// --- Study ---

export interface Study {
  id?:          string
  ativo:                Ativo
  tarifas:              Tarifas
  tributos:             Tributos
  capex:                Capex
  opex:                 Opex
  reinvestimentos:      Reinvestimento[]
  premissasFinanceiras: PremissasFinanceiras
  criadoEm:             string
  atualizadoEm:         string
  dadosUsina?:  Record<string, unknown>
  premissas?:   Record<string, unknown>
  parametros?:  Record<string, unknown>
}

// --- Helpers ---

export function calcCapexTotal(c: Omit<Capex, 'total'>): number {
  const base = c.usina + c.obraRede + c.engenharia + c.licenciamento + c.comissionamento
  return base * (1 + c.contingencia / 100)
}

// --- Defaults ---

export const STUDY_DEFAULTS: Omit<Study, 'id' | 'criadoEm' | 'atualizadoEm'> = {
  ativo: {
    nomeEstudo:     '',
    nomeUsina:      '',
    tipoAquisicao:  'greenfield',
    fonte:          'cgh',
    potencia:       0,
    tipoGD:         'GD II',
    fatorCapacidade:35,
    demanda:        0,
    consumoAnualUG: 0,
  },
  tarifas: {
    tusdG:       0,
    tarifaVenda: 0,
  },
  tributos: {
    aliquota: 12.65,
  },
  capex: {
    usina:           0,
    obraRede:        0,
    engenharia:      0,
    licenciamento:   0,
    comissionamento: 0,
    contingencia:    5,
    total:           0,
  },
  opex: {
    operacao:    1,
    manutencao:  1,
    seguro:      0.5,
    gestao:      5,
    arrendamento:0,
  },
  reinvestimentos: [],
  premissasFinanceiras: {
    vidaUtil: 20,
    tma:      10,
    selic:    12.25,
    inflacao: 4.5,
  },
}

// --- Migracao Fase 1 para 1.1 ---

const fonteMap: Record<string, FonteGeracao> = {
  solar: 'solar', ufv: 'ufv',
  cgh: 'cgh', pch: 'pch', eolica: 'eolica',
  biomassa: 'biomassa', biogas: 'biogas', outros: 'outros',
}

export function migrateStudy(raw: Record<string, unknown>): Study {
  if (raw.ativo) return raw as unknown as Study

  const du = (raw.dadosUsina as Record<string, unknown>) ?? {}
  const pr = (raw.premissas  as Record<string, unknown>) ?? {}
  const pa = (raw.parametros as Record<string, unknown>) ?? {}
  const tarifas  = (pr.tarifas    as Record<string, unknown>) ?? {}
  const impostos = (pr.impostos   as Record<string, unknown>) ?? {}
  const financ   = (pr.financeiras as Record<string, unknown>) ?? {}
  const custos   = (pr.custos     as Record<string, unknown>) ?? {}

  const anoFinal   = Number(pa.anoFinal   ?? 2045)
  const anoInicial = Number(pa.anoInicial ?? 2026)

  const usina    = Number(du.custoUsina      ?? 0)
  const rede     = Number(du.custoObraRede   ?? 0)
  const totalLeg = Number(du.investimentoTotal ?? (usina + rede))

  return {
    ...(raw as object),
    criadoEm:    (raw.criadoEm    as string) ?? new Date().toISOString(),
    atualizadoEm:(raw.atualizadoEm as string) ?? new Date().toISOString(),
    ativo: {
      nomeEstudo:     String(du.nomeEstudo       ?? ''),
      nomeUsina:      String(du.nomeUsina        ?? ''),
      tipoAquisicao:  'greenfield',
      fonte:          fonteMap[String(du.fonte   ?? 'cgh')] ?? 'cgh',
      potencia:       Number(du.potencia         ?? 0),
      tipoGD:         (du.tipoGD as TipoGD)     ?? 'GD II',
      fatorCapacidade:Number(du.fatorCapacidade  ?? 35),
      demanda:        Number(du.demanda          ?? 0),
      consumoAnualUG: Number(du.consumoAnualUG   ?? 0),
    },
    tarifas: {
      tusdG:       Number(tarifas.tusdGeracao ?? tarifas.tusd ?? 0),
      tarifaVenda: Number(tarifas.te          ?? 0),
    },
    tributos: {
      aliquota: (Number(impostos.pis ?? 0) + Number(impostos.cofins ?? 0) + Number(impostos.icms ?? 0)) || 12.65,
    },
    capex: {
      usina,
      obraRede:        rede,
      engenharia:      0,
      licenciamento:   0,
      comissionamento: 0,
      contingencia:    5,
      total:           totalLeg,
    },
    opex: {
      operacao:    1,
      manutencao:  Number(custos.manutencao   ?? 1),
      seguro:      Number(custos.seguro       ?? 0.5),
      gestao:      Number(custos.gestao       ?? 5),
      arrendamento:Number(custos.arrendamento ?? 0),
    },
    reinvestimentos: [],
    premissasFinanceiras: {
      vidaUtil: Math.max(1, anoFinal - anoInicial + 1),
      tma:      Number(financ.tma   ?? 10),
      selic:    Number(financ.selic ?? 12.25),
      inflacao: Number(financ.ipca  ?? 4.5),
    },
  } as Study
}
