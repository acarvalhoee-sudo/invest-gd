/**
 * aneelApi.ts
 * Integração com a API de Dados Abertos da ANEEL
 *
 * Endpoint base: https://dadosabertos.aneel.gov.br/api/3/action/datastore_search
 * Resource ID de tarifas homologadas: "fcf2906c-7c32-4b9b-a637-054e7a5234f4"
 *
 * NOTA: A API da ANEEL pode sofrer indisponibilidades.
 * O sistema usa dados hardcoded como fallback.
 */

import type { Distribuidora, TarifaANEEL } from '../types/studyTypes'

const ANEEL_BASE = 'https://dadosabertos.aneel.gov.br/api/3/action/datastore_search'
const RESOURCE_TARIFAS = 'fcf2906c-7c32-4b9b-a637-054e7a5234f4'
const RESOURCE_AGENTES = 'fec37512-a15a-4b46-8700-ba75c01d1e7f'

// ─── Fallback de distribuidoras mais comuns ───

export const DISTRIBUIDORAS_FALLBACK: Distribuidora[] = [
  { sigAgente: 'CEMIG-D',    nomAgente: 'CEMIG Distribuição',           estado: 'MG' },
  { sigAgente: 'COPEL-DIS',  nomAgente: 'COPEL Distribuição',           estado: 'PR' },
  { sigAgente: 'CEEE-D',     nomAgente: 'CEEE Distribuição',            estado: 'RS' },
  { sigAgente: 'CPFL-PAULIS',nomAgente: 'CPFL Paulista',                estado: 'SP' },
  { sigAgente: 'ELETROPAULO',nomAgente: 'Enel Distribuição São Paulo',  estado: 'SP' },
  { sigAgente: 'COELBA',     nomAgente: 'COELBA',                       estado: 'BA' },
  { sigAgente: 'CELPE',      nomAgente: 'CELPE',                        estado: 'PE' },
  { sigAgente: 'COELCE',     nomAgente: 'COELCE',                       estado: 'CE' },
  { sigAgente: 'CELG-D',     nomAgente: 'Enel Distribuição Goiás',      estado: 'GO' },
  { sigAgente: 'ENERGISA-MS',nomAgente: 'Energisa Mato Grosso do Sul',  estado: 'MS' },
  { sigAgente: 'ENERGISA-MT',nomAgente: 'Energisa Mato Grosso',         estado: 'MT' },
  { sigAgente: 'LIGHT',      nomAgente: 'LIGHT Serviços de Eletricidade',estado: 'RJ' },
  { sigAgente: 'AMPLA',      nomAgente: 'Enel Distribuição Rio',        estado: 'RJ' },
  { sigAgente: 'ELEKTRO',    nomAgente: 'Elektro Redes',                estado: 'SP' },
  { sigAgente: 'CELESC-DIS', nomAgente: 'CELESC Distribuição',          estado: 'SC' },
  { sigAgente: 'RGE',        nomAgente: 'RGE Sul Distribuidora',        estado: 'RS' },
  { sigAgente: 'AES-SUL',    nomAgente: 'Equatorial Sul',               estado: 'RS' },
]

// ─── Tarifas de fallback (valores médios 2024) ─

export const TARIFAS_FALLBACK: Record<string, TarifaANEEL> = {
  'CEMIG-D_A4_Azul': {
    distribuidora: 'CEMIG-D',
    subgrupo: 'A4',
    modalidade: 'Azul',
    tePonta: 452.5,
    teFp: 360.8,
    tusdPonta: 312.4,
    tusdFp: 218.6,
    tusdGeracao: 12.5,
    tarifaDemanda: 42.8,
  },
  'CEMIG-D_B3_Convencional': {
    distribuidora: 'CEMIG-D',
    subgrupo: 'B3',
    modalidade: 'Convencional',
    tePonta: 452.5,
    teFp: 360.8,
    tusdPonta: 312.4,
    tusdFp: 218.6,
    tusdGeracao: 12.5,
    tarifaDemanda: 0,
  },
}

// ─── Buscar distribuidoras da API ─────────────

export async function buscarDistribuidoras(): Promise<Distribuidora[]> {
  try {
    const url = `${ANEEL_BASE}?resource_id=${RESOURCE_AGENTES}&limit=200`
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    const json = await resp.json()
    const records = json?.result?.records ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return records.map((r: any) => ({
      sigAgente: r.SigAgente ?? r.NomAgente,
      nomAgente: r.NomAgente,
      estado: r.SigUFPrincipal ?? '',
    }))
  } catch {
    // Retorna fallback em caso de indisponibilidade
    return DISTRIBUIDORAS_FALLBACK
  }
}

// ─── Buscar tarifas por distribuidora ────────

export async function buscarTarifas(
  distribuidora: string,
  subgrupo: string,
  modalidade: string
): Promise<TarifaANEEL | null> {
  try {
    const filtros = {
      SigAgente: distribuidora,
      DscSubgrupo: subgrupo,
      DscModalidadeTarifaria: modalidade,
    }
    const url =
      `${ANEEL_BASE}?resource_id=${RESOURCE_TARIFAS}` +
      `&filters=${encodeURIComponent(JSON.stringify(filtros))}` +
      `&limit=10`

    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    const json = await resp.json()
    const records = json?.result?.records ?? []
    if (records.length === 0) return null

    // Agrupa os postos (Ponta e Fora Ponta)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ponta = records.find((r: any) => r.DscBaseTarifaria === 'Ponta')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fp    = records.find((r: any) => r.DscBaseTarifaria === 'Fora Ponta')

    return {
      distribuidora,
      subgrupo,
      modalidade,
      tePonta:      parseFloat(ponta?.VlrTE ?? fp?.VlrTE ?? '0') * 1000, // R$/MWh
      teFp:         parseFloat(fp?.VlrTE ?? '0') * 1000,
      tusdPonta:    parseFloat(ponta?.VlrTUSD ?? '0') * 1000,
      tusdFp:       parseFloat(fp?.VlrTUSD ?? '0') * 1000,
      tusdGeracao:  parseFloat(fp?.VlrTUSD ?? '0') * 1000 * 0.05,
      tarifaDemanda: parseFloat(ponta?.VlrTUSD ?? '0') * 1000,
    }
  } catch {
    // Fallback
    const key = `${distribuidora}_${subgrupo}_${modalidade}`
    return TARIFAS_FALLBACK[key] ?? null
  }
}
