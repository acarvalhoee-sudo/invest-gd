/**
 * study.ts - Tipos da Fase 1.4
 * Compatibilidade retroativa com Fases 1, 1.1, 1.2 e 1.3.
 */

// --- Enums ---

export type FonteGeracao =
  | 'ufv' | 'cgh' | 'pch' | 'eolica'
  | 'biomassa' | 'biogas' | 'outros' | 'solar'

export type TipoGD = 'GD I' | 'GD II' | 'GD III'

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

export const CONCESSIONARIAS = [
  'COPEL', 'CELESC', 'CEMIG',
  'CPFL Paulista', 'CPFL Piratininga', 'CPFL Santa Cruz',
  'ENEL SP', 'ENEL RJ', 'ENEL CE',
  'LIGHT',
  'EQUATORIAL ALAGOAS', 'EQUATORIAL MARANHAO', 'EQUATORIAL PARA',
  'EQUATORIAL PIAUI', 'EQUATORIAL GOIAS',
  'NEOENERGIA COELBA', 'NEOENERGIA CELPE', 'NEOENERGIA COSERN',
  'NEOENERGIA ELEKTRO', 'NEOENERGIA BRASILIA',
  'RGE',
  'ENERGISA MATO GROSSO', 'ENERGISA MATO GROSSO DO SUL',
  'ENERGISA MINAS RIO', 'ENERGISA PARAIBA',
  'ENERGISA SERGIPE', 'ENERGISA TOCANTINS',
  'AMAZONAS ENERGIA',
  'EDP SP', 'EDP ES',
  'CEEE EQUATORIAL',
  'DMED', 'COCEL', 'FORCEL', 'CHESP', 'SULGIPE',
  'OUTRAS',
] as const

export type Concessionaria = (typeof CONCESSIONARIAS)[number] | string

// --- Interfaces ---

export interface Ativo {
  nomeEstudo:        string
  nomeUsina:         string
  concessionaria:    Concessionaria
  fonte:             FonteGeracao
  potencia:          number
  tipoGD:            TipoGD
  fatorCapacidade:   number
  demanda:           number
  consumoAnualUG:    number
  geracaoMediaMensal:number
}

export interface Tarifas {
  tusdG:         number   // R$/kW
  tarifaVenda:   number   // R$/MWh
  reajusteAnual: number   // % a.a.
}

/**
 * Tributos — campos INDEPENDENTES, sem cálculo automático entre eles.
 *
 * tributosReceita: alíquota usada para calcular receita líquida, fluxo de caixa,
 *                  VPL, TIR e Payback (campo primário dos cálculos financeiros).
 * pis / cofins / icms: usados apenas para simulações tarifárias e memorial de cálculo.
 *                       NÃO são somados para gerar tributosReceita.
 */
export interface Tributos {
  tributosReceita: number   // % — base dos cálculos financeiros
  pis:             number   // % — simulação tarifária
  cofins:          number   // % — simulação tarifária
  icms:            number   // % — simulação tarifária
}

export interface Capex {
  usina:    number   // R$
  obraRede: number   // R$
  total:    number   // calculado: usina + obraRede
}

export interface Opex {
  operacao:    number   // % do CAPEX
  manutencao:  number   // % do CAPEX
  seguro:      number   // % do CAPEX
  gestao:      number   // % sobre receita
  arrendamento:number   // R$/mes
  fixoGestao:  number   // R$/mes
}

export interface PremissasFinanceiras {
  vidaUtil:         number   // anos
  tma:              number   // % a.a.
  selic:            number   // % a.a.
  inflacao:         number   // % a.a.
  mesesPrimeiroAno: number   // 1-12
}

// --- Study ---

export interface Study {
  id?:                  string
  ativo:                Ativo
  tarifas:              Tarifas
  tributos:             Tributos
  capex:                Capex
  opex:                 Opex
  premissasFinanceiras: PremissasFinanceiras
  criadoEm:             string
  atualizadoEm:         string
  // Legado
  dadosUsina?:          Record<string, unknown>
  premissas?:           Record<string, unknown>
  parametros?:          Record<string, unknown>
  reinvestimentos?:     unknown[]
}

// --- Helpers ---

export function calcGeracaoMensal(potencia: number, fatorCapacidade: number): number {
  return potencia * (fatorCapacidade / 100) * 730 / 1000
}

export function calcCapexTotal(c: Pick<Capex, 'usina' | 'obraRede'>): number {
  return c.usina + c.obraRede
}

// --- Defaults ---

export const STUDY_DEFAULTS: Omit<Study, 'id' | 'criadoEm' | 'atualizadoEm'> = {
  ativo: {
    nomeEstudo:        '',
    nomeUsina:         '',
    concessionaria:    '',
    fonte:             'cgh',
    potencia:          0,
    tipoGD:            'GD II',
    fatorCapacidade:   35,
    demanda:           0,
    consumoAnualUG:    0,
    geracaoMediaMensal:0,
  },
  tarifas: {
    tusdG:         0,
    tarifaVenda:   0,
    reajusteAnual: 5,
  },
  tributos: {
    tributosReceita: 12.65,
    pis:             1.65,
    cofins:          7.60,
    icms:            0.00,
  },
  capex: {
    usina:    0,
    obraRede: 0,
    total:    0,
  },
  opex: {
    operacao:    1,
    manutencao:  1,
    seguro:      0.5,
    gestao:      5,
    arrendamento:0,
    fixoGestao:  0,
  },
  premissasFinanceiras: {
    vidaUtil:         20,
    tma:              10,
    selic:            12.25,
    inflacao:         4.5,
    mesesPrimeiroAno: 12,
  },
}

// --- Migracao ---

const fonteMap: Record<string, FonteGeracao> = {
  solar: 'solar', ufv: 'ufv', cgh: 'cgh', pch: 'pch',
  eolica: 'eolica', biomassa: 'biomassa', biogas: 'biogas', outros: 'outros',
}

function migrateTributos(raw: Record<string, unknown>): Tributos {
  // Fase 1.4 — tem tributosReceita
  if (typeof raw.tributosReceita === 'number') {
    return {
      tributosReceita: Number(raw.tributosReceita ?? 12.65),
      pis:             Number(raw.pis    ?? 1.65),
      cofins:          Number(raw.cofins ?? 7.60),
      icms:            Number(raw.icms   ?? 0.00),
    }
  }
  // Fase 1.3 — tinha aliquotaTotal (calculado)
  if (typeof raw.pis === 'number' || typeof raw.cofins === 'number') {
    const pis    = Number(raw.pis    ?? 1.65)
    const cofins = Number(raw.cofins ?? 7.60)
    const icms   = Number(raw.icms   ?? 0.00)
    // aliquotaTotal vira tributosReceita
    const tributosReceita = typeof raw.aliquotaTotal === 'number'
      ? Number(raw.aliquotaTotal)
      : pis + cofins + icms
    return { tributosReceita, pis, cofins, icms }
  }
  // Fase 1.1/1.2 — tinha aliquota consolidada
  const aliquota = Number(raw.aliquota ?? 12.65)
  return {
    tributosReceita: aliquota,
    pis:             1.65,
    cofins:          7.60,
    icms:            0.00,
  }
}

export function migrateStudy(raw: Record<string, unknown>): Study {
  const rawAtivo = raw.ativo as Record<string, unknown> | undefined

  // Fase 1.1+ — ja tem ativo
  if (rawAtivo && typeof rawAtivo === 'object') {
    const rawCapex   = raw.capex   as Record<string, unknown> | undefined
    const rawOpex    = raw.opex    as Record<string, unknown> | undefined
    const rawTarifas = raw.tarifas as Record<string, unknown> | undefined
    const rawPF      = raw.premissasFinanceiras as Record<string, unknown> | undefined
    const rawTrib    = raw.tributos as Record<string, unknown> | undefined

    const potencia        = Number(rawAtivo.potencia        ?? 0)
    const fatorCapacidade = Number(rawAtivo.fatorCapacidade ?? 35)
    const geracaoMediaMensal =
      typeof rawAtivo.geracaoMediaMensal === 'number' && rawAtivo.geracaoMediaMensal > 0
        ? rawAtivo.geracaoMediaMensal
        : calcGeracaoMensal(potencia, fatorCapacidade)

    const usina    = Number(rawCapex?.usina    ?? 0)
    const obraRede = Number(rawCapex?.obraRede ?? 0)

    return {
      ...(raw as object),
      ativo: {
        nomeEstudo:        String(rawAtivo.nomeEstudo    ?? ''),
        nomeUsina:         String(rawAtivo.nomeUsina     ?? ''),
        concessionaria:    String(rawAtivo.concessionaria ?? ''),
        fonte:             fonteMap[String(rawAtivo.fonte ?? 'cgh')] ?? 'cgh',
        potencia,
        tipoGD:            (rawAtivo.tipoGD as TipoGD) ?? 'GD II',
        fatorCapacidade,
        demanda:           Number(rawAtivo.demanda        ?? 0),
        consumoAnualUG:    Number(rawAtivo.consumoAnualUG ?? 0),
        geracaoMediaMensal,
      },
      tarifas: {
        tusdG:         Number(rawTarifas?.tusdG         ?? 0),
        tarifaVenda:   Number(rawTarifas?.tarifaVenda   ?? 0),
        reajusteAnual: Number(rawTarifas?.reajusteAnual ?? 5),
      },
      tributos: migrateTributos(rawTrib ?? {}),
      capex: {
        usina,
        obraRede,
        total: Number(rawCapex?.total ?? (usina + obraRede)),
      },
      opex: {
        operacao:    Number(rawOpex?.operacao    ?? 1),
        manutencao:  Number(rawOpex?.manutencao  ?? 1),
        seguro:      Number(rawOpex?.seguro      ?? 0.5),
        gestao:      Number(rawOpex?.gestao      ?? 5),
        arrendamento:Number(rawOpex?.arrendamento ?? 0),
        fixoGestao:  Number(rawOpex?.fixoGestao  ?? 0),
      },
      premissasFinanceiras: {
        vidaUtil:         Number(rawPF?.vidaUtil         ?? 20),
        tma:              Number(rawPF?.tma              ?? 10),
        selic:            Number(rawPF?.selic            ?? 12.25),
        inflacao:         Number(rawPF?.inflacao         ?? 4.5),
        mesesPrimeiroAno: Number(rawPF?.mesesPrimeiroAno ?? 12),
      },
    } as Study
  }

  // Fase 1 legado — tem dadosUsina
  const du = (raw.dadosUsina as Record<string, unknown>) ?? {}
  const pr = (raw.premissas  as Record<string, unknown>) ?? {}
  const pa = (raw.parametros as Record<string, unknown>) ?? {}
  const tarifas  = (pr.tarifas     as Record<string, unknown>) ?? {}
  const impostos = (pr.impostos    as Record<string, unknown>) ?? {}
  const financ   = (pr.financeiras as Record<string, unknown>) ?? {}
  const custos   = (pr.custos      as Record<string, unknown>) ?? {}

  const anoFinal   = Number(pa.anoFinal   ?? 2045)
  const anoInicial = Number(pa.anoInicial ?? 2026)
  const usina      = Number(du.custoUsina     ?? 0)
  const obraRede   = Number(du.custoObraRede  ?? 0)
  const totalLeg   = Number(du.investimentoTotal ?? (usina + obraRede))
  const potencia   = Number(du.potencia        ?? 0)
  const fc         = Number(du.fatorCapacidade ?? 35)

  return {
    ...(raw as object),
    criadoEm:    (raw.criadoEm    as string) ?? new Date().toISOString(),
    atualizadoEm:(raw.atualizadoEm as string) ?? new Date().toISOString(),
    ativo: {
      nomeEstudo:        String(du.nomeEstudo     ?? ''),
      nomeUsina:         String(du.nomeUsina      ?? ''),
      concessionaria:    '',
      fonte:             fonteMap[String(du.fonte ?? 'cgh')] ?? 'cgh',
      potencia,
      tipoGD:            (du.tipoGD as TipoGD) ?? 'GD II',
      fatorCapacidade:   fc,
      demanda:           Number(du.demanda        ?? 0),
      consumoAnualUG:    Number(du.consumoAnualUG ?? 0),
      geracaoMediaMensal:calcGeracaoMensal(potencia, fc),
    },
    tarifas: {
      tusdG:         Number(tarifas.tusdGeracao ?? tarifas.tusd ?? 0),
      tarifaVenda:   Number(tarifas.te          ?? 0),
      reajusteAnual: 5,
    },
    tributos: {
      tributosReceita: (Number(impostos.pis ?? 0) + Number(impostos.cofins ?? 0) + Number(impostos.icms ?? 0)) || 12.65,
      pis:             Number(impostos.pis    ?? 1.65),
      cofins:          Number(impostos.cofins ?? 7.60),
      icms:            Number(impostos.icms   ?? 0.00),
    },
    capex: { usina, obraRede, total: totalLeg },
    opex: {
      operacao:    1,
      manutencao:  Number(custos.manutencao   ?? 1),
      seguro:      Number(custos.seguro       ?? 0.5),
      gestao:      Number(custos.gestao       ?? 5),
      arrendamento:Number(custos.arrendamento ?? 0),
      fixoGestao:  0,
    },
    premissasFinanceiras: {
      vidaUtil:         Math.max(1, anoFinal - anoInicial + 1),
      tma:              Number(financ.tma   ?? 10),
      selic:            Number(financ.selic ?? 12.25),
      inflacao:         Number(financ.ipca  ?? 4.5),
      mesesPrimeiroAno: 12,
    },
  } as Study
}
