/**
 * studyTypes.ts
 * Definições de tipos TypeScript para o sistema INVEST GD
 * Cobre toda a estrutura de dados de estudos de viabilidade
 */

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

/** Tipo de fonte de geração */
export type FonteGeracao = 'solar' | 'cgh' | 'pch' | 'eolica'

/** Tipo de GD conforme regulação ANEEL */
export type TipoGD = 'GD I' | 'GD II' | 'GD III'

/** Modalidade tarifária */
export type ModalidadeTarifaria = 'Verde' | 'Azul' | 'Branca' | 'Convencional'

/** Subgrupo tarifário */
export type SubgrupoTarifario = 'A1' | 'A2' | 'A3' | 'A3a' | 'A4' | 'AS' | 'B1' | 'B2' | 'B3' | 'B4'

/** Status de viabilidade */
export type StatusViabilidade = 'VIÁVEL' | 'NÃO VIÁVEL' | 'INDEFINIDO'

// ─────────────────────────────────────────────
// ABA 01 – DADOS DA USINA
// ─────────────────────────────────────────────

export interface DadosUsina {
  /** Nome identificador do estudo */
  nomeEstudo: string
  /** Nome comercial da usina */
  nomeUsina: string
  /** Tipo de fonte geradora */
  fonte: FonteGeracao
  /** Potência instalada (kW ou kWp para solar) */
  potencia: number
  /** Demanda contratada em kW */
  demanda: number
  /** Fator de capacidade em % (ex: 35 para 35%) */
  fatorCapacidade: number
  /** Custo de aquisição da usina em R$ */
  custoUsina: number
  /** Custo de obras de rede/conexão em R$ */
  custoObraRede: number
  /** Consumo anual da unidade gestora em MWh */
  consumoAnualUG: number
  /** Tipo de GD conforme regulação */
  tipoGD: TipoGD
}

// ─────────────────────────────────────────────
// ABA 02 – PREMISSAS ECONÔMICAS E TARIFÁRIAS
// ─────────────────────────────────────────────

export interface TarifahsEnergia {
  /** Distribuidora selecionada */
  distribuidora: string
  /** Subgrupo tarifário */
  subgrupo: SubgrupoTarifario
  /** Modalidade tarifária */
  modalidade: ModalidadeTarifaria
  /** Tarifa de energia na ponta R$/MWh */
  tePonta: number
  /** Tarifa de energia fora ponta R$/MWh */
  teFp: number
  /** TUSD ponta R$/MWh */
  tusdPonta: number
  /** TUSD fora ponta R$/MWh */
  tusdFp: number
  /** TUSD geração R$/MWh */
  tusdGeracao: number
  /** Tarifa de demanda R$/kW */
  tarifaDemanda: number
}

export interface Impostos {
  /** PIS em % */
  pis: number
  /** COFINS em % */
  cofins: number
  /** ICMS em % */
  icms: number
  /** Habilitar/desabilitar PIS */
  habPis: boolean
  /** Habilitar/desabilitar COFINS */
  habCofins: boolean
  /** Habilitar/desabilitar ICMS */
  habIcms: boolean
}

export interface PremissasFinanceiras {
  /** Reajuste tarifário anual em % */
  reajusteAnual: number
  /** Taxa de manutenção anual sobre investimento em % */
  manutencao: number
  /** Gestão variável sobre receita em % */
  gestaoVariavel: number
  /** IPCA anual em % */
  ipca: number
  /** Valor fixo mensal de gestão em R$ */
  gestaoFixaMensal: number
  /** Taxa SELIC anual em % */
  selic: number
  /** Taxa mínima de atratividade em % */
  tma: number
}

export interface PremissasEconomicas {
  tarifas: TarifahsEnergia
  impostos: Impostos
  financeiras: PremissasFinanceiras
}

// ─────────────────────────────────────────────
// ABA 03 – PARÂMETROS DE ANÁLISE
// ─────────────────────────────────────────────

export interface ParametrosAnalise {
  /** Ano de início da análise */
  anoInicial: number
  /** Ano de fim da análise */
  anoFinal: number
  /** Quantidade de meses no primeiro ano */
  mesesPrimeiroAno: number
}

// ─────────────────────────────────────────────
// LINHA DO FLUXO DE CAIXA
// ─────────────────────────────────────────────

export interface LinhaFluxoCaixa {
  /** Ano de referência */
  ano: number
  /** Número de meses considerados neste ano */
  meses: number
  /** Produção em MWh */
  producao: number
  /** Receita bruta em R$ */
  receita: number
  /** Custo de manutenção em R$ */
  manutencao: number
  /** Gestão variável em R$ */
  gestaoVariavel: number
  /** Gestão fixa corrigida por IPCA em R$ */
  gestaoFixa: number
  /** Custo de demanda em R$ */
  demanda: number
  /** Total de impostos em R$ */
  impostos: number
  /** Total de saídas em R$ */
  totalSaidas: number
  /** Fluxo de caixa líquido em R$ */
  fluxoCaixa: number
  /** Fluxo de caixa acumulado em R$ */
  fluxoAcumulado: number
  /** Fluxo de caixa descontado pela TMA em R$ */
  fluxoDescontado: number
  /** Fluxo descontado acumulado em R$ */
  fluxoDescontadoAcumulado: number
  /** Rentabilidade do período em % */
  rentabilidade: number
}

// ─────────────────────────────────────────────
// INDICADORES FINANCEIROS
// ─────────────────────────────────────────────

export interface IndicadoresFinanceiros {
  /** Valor Presente Líquido em R$ */
  vpl: number
  /** Taxa Interna de Retorno em % */
  tir: number
  /** Payback simples em anos */
  paybackSimples: number
  /** Payback descontado em anos */
  paybackDescontado: number
  /** Investimento total em R$ */
  investimentoTotal: number
  /** Investimento por kW em R$/kW */
  investimentoKw: number
  /** Produção anual média em MWh */
  producaoAnualMedia: number
  /** Receita média anual em R$ */
  receitaMedia: number
  /** Fluxo de caixa médio anual em R$ */
  fluxoMedio: number
  /** Status de viabilidade */
  viabilidade: StatusViabilidade
}

// ─────────────────────────────────────────────
// ESTRUTURA COMPLETA DO ESTUDO
// ─────────────────────────────────────────────

export interface Estudo {
  /** ID único gerado pelo Firestore */
  id?: string
  /** ID do usuário proprietário */
  userId: string
  /** Dados da usina */
  dadosUsina: DadosUsina
  /** Premissas econômicas e tarifárias */
  premissas: PremissasEconomicas
  /** Parâmetros de análise */
  parametros: ParametrosAnalise
  /** Resultados calculados */
  resultados?: ResultadosEstudo
  /** Data de criação */
  criadoEm: Date | string
  /** Data da última atualização */
  atualizadoEm: Date | string
}

export interface ResultadosEstudo {
  /** Indicadores financeiros */
  indicadores: IndicadoresFinanceiros
  /** Tabela de fluxo de caixa (Ano 0 incluso) */
  fluxoCaixa: LinhaFluxoCaixa[]
}

// ─────────────────────────────────────────────
// DADOS DA API ANEEL
// ─────────────────────────────────────────────

export interface Distribuidora {
  sigAgente: string
  nomAgente: string
  estado: string
}

export interface TarifaANEEL {
  distribuidora: string
  subgrupo: string
  modalidade: string
  tePonta: number
  teFp: number
  tusdPonta: number
  tusdFp: number
  tusdGeracao: number
  tarifaDemanda: number
}

// ─────────────────────────────────────────────
// TIPOS AUXILIARES
// ─────────────────────────────────────────────

/** Valores padrão para novo estudo */
export const ESTUDO_DEFAULTS: Omit<Estudo, 'id' | 'userId' | 'criadoEm' | 'atualizadoEm'> = {
  dadosUsina: {
    nomeEstudo: '',
    nomeUsina: '',
    fonte: 'cgh',
    potencia: 0,
    demanda: 0,
    fatorCapacidade: 35,
    custoUsina: 0,
    custoObraRede: 0,
    consumoAnualUG: 0,
    tipoGD: 'GD I',
  },
  premissas: {
    tarifas: {
      distribuidora: '',
      subgrupo: 'B3',
      modalidade: 'Convencional',
      tePonta: 0.4,
      teFp: 0.35,
      tusdPonta: 0.3,
      tusdFp: 0.25,
      tusdGeracao: 0.1,
      tarifaDemanda: 30,
    },
    impostos: {
      pis: 0.65,
      cofins: 3.0,
      icms: 0,
      habPis: true,
      habCofins: true,
      habIcms: false,
    },
    financeiras: {
      reajusteAnual: 6.0,
      manutencao: 1.0,
      gestaoVariavel: 5.0,
      ipca: 4.5,
      gestaoFixaMensal: 500,
      selic: 10.5,
      tma: 12.0,
    },
  },
  parametros: {
    anoInicial: new Date().getFullYear(),
    anoFinal: new Date().getFullYear() + 19,
    mesesPrimeiroAno: 12,
  },
}

/** Nomes amigáveis das fontes */
export const FONTE_LABELS: Record<FonteGeracao, string> = {
  solar: 'Solar (UFV)',
  cgh: 'CGH',
  pch: 'PCH',
  eolica: 'Eólica',
}

/** Cores das fontes para gráficos */
export const FONTE_COLORS: Record<FonteGeracao, string> = {
  solar: '#f59e0b',
  cgh: '#0ea5e9',
  pch: '#6366f1',
  eolica: '#10b981',
}
