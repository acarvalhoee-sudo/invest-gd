/**
 * useScenarios.ts — Hook para gestão de cenários de um estudo (FASE 04)
 * Carrega, cria, duplica, atualiza e deleta cenários.
 * Recalcula resultados via financialEngine ao salvar.
 *
 * Auto-migração: cenários com paybackDescontado < paybackSimples (bug de versão
 * anterior) são recalculados silenciosamente na primeira carga.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Scenario, ScenarioParams } from '@/types/scenario'
import {
  getScenarios, createScenario, updateScenario,
  deleteScenario, duplicateScenario, saveScenarioResults,
} from '@/services/scenarioService'
import { calcResultados }  from '@/utils/financialEngine'
import type { Study }      from '@/types/study'

/** Monta um Study parcial com os params do cenario para passar ao motor */
function applyParams(base: Study, p: ScenarioParams): Study {
  return {
    ...base,
    tarifas: {
      ...base.tarifas,
      tarifaVenda:   p.tarifaVenda,
      tusdG:         p.tusdG,
      reajusteAnual: p.reajusteAnual,
    },
    ativo: {
      ...base.ativo,
      fatorCapacidade: p.fatorCapacidade,
    },
    capex: {
      ...base.capex,
      total:  p.capexTotal,
      usina:  p.capexTotal,
    },
    opex: {
      operacao:     p.opexOperacao,
      manutencao:   p.opexManutencao,
      seguro:       p.opexSeguro,
      gestao:       p.opexGestao,
      arrendamento: p.opexArrendamento,
      fixoGestao:   p.opexFixoGestao,
    },
    tributos: {
      ...base.tributos,
      tributosReceita: p.tributosReceita,
      pis:             p.pis,
      cofins:          p.cofins,
      icms:            p.icms,
    },
    premissasFinanceiras: {
      ...base.premissasFinanceiras,
      tma:      p.tma,
      selic:    p.selic,
      inflacao: p.ipca,
      vidaUtil: p.vidaUtil,
    },
  }
}

/**
 * Calcula ScenarioResults usando o motor financeiro.
 *
 * Garante invariante obrigatório:
 *   paybackDescontado >= paybackSimples
 * (se violado, o cálculo está errado — log de aviso emitido)
 */
function calcScenarioResults(base: Study, p: ScenarioParams): Scenario['results'] {
  try {
    const merged = applyParams(base, p)
    const r      = calcResultados(merged)
    const tabela = r.tabela

    /* Validação de sanidade */
    if (
      r.paybackDescontado !== null &&
      r.paybackSimples    !== null &&
      r.paybackDescontado < r.paybackSimples
    ) {
      console.warn(
        `[useScenarios] INVARIANTE VIOLADA — paybackDescontado (${r.paybackDescontado?.toFixed(2)}) ` +
        `< paybackSimples (${r.paybackSimples?.toFixed(2)}). Verificar financialEngine.`
      )
    }

    const receitaAcum = tabela.reduce((s, row) => s + row.receitaBruta, 0)
    const ebitdaAcum  = tabela.reduce((s, row) => s + row.ebitda,       0)

    return {
      vpl:                r.vpl,
      tir:                r.tir,
      paybackSimples:     r.paybackSimples,
      paybackDescontado:  r.paybackDescontado,
      receitaBrutaAno1:   r.receitaAnual,
      receitaLiquidaAno1: r.ebitdaAnual,
      receitaAcumulada:   receitaAcum,
      ebitdaAcumulado:    ebitdaAcum,
      capex:              p.capexTotal,
      geracaoAnual:       r.geracaoMediaMensal * 12,
      calculadoEm:        new Date().toISOString(),
    }
  } catch {
    return undefined
  }
}

/**
 * Detecta se um resultado de cenário tem o bug de payback descontado
 * (paybackDescontado < paybackSimples — invariante sempre violada).
 */
function isStalePayback(results: NonNullable<Scenario['results']>): boolean {
  const { paybackSimples, paybackDescontado } = results
  if (paybackDescontado === null || paybackSimples === null) return false
  return paybackDescontado < paybackSimples
}

export function useScenarios(studyId: string | undefined, baseStudy: Study | null) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  /* Garante que a migração automática rode apenas uma vez por montagem */
  const migrationDoneRef = useRef(false)

  const reload = useCallback(async () => {
    if (!studyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getScenarios(studyId)
      data.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      setScenarios(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar cenarios')
    } finally {
      setLoading(false)
    }
  }, [studyId])

  useEffect(() => { reload() }, [reload])

  /* ── Auto-migração: recalcula cenários com payback descontado inválido ── */
  useEffect(() => {
    if (migrationDoneRef.current)       return
    if (!baseStudy)                     return
    if (scenarios.length === 0)         return

    const stale = scenarios.filter(
      (s) => s.id && s.results && isStalePayback(s.results)
    )
    if (stale.length === 0) {
      migrationDoneRef.current = true
      return
    }

    migrationDoneRef.current = true
    console.info(`[useScenarios] Recalculando ${stale.length} cenário(s) com payback descontado obsoleto...`)

    ;(async () => {
      const updated: Scenario[] = []
      for (const sc of stale) {
        if (!sc.id) continue
        const results = calcScenarioResults(baseStudy, sc.params)
        if (!results) continue
        await saveScenarioResults(sc.id, results)
        updated.push({ ...sc, results })
      }
      if (updated.length > 0) {
        setScenarios((prev) =>
          prev.map((s) => {
            const fix = updated.find((u) => u.id === s.id)
            return fix ?? s
          })
        )
        console.info(`[useScenarios] ${updated.length} cenário(s) recalculado(s) com sucesso.`)
      }
    })()
  }, [scenarios, baseStudy])

  /** Cria cenario e persiste resultados calculados */
  const add = useCallback(async (name: string, params: ScenarioParams): Promise<string | null> => {
    if (!studyId) return null
    const results = baseStudy ? calcScenarioResults(baseStudy, params) : undefined
    const id = await createScenario({ studyId, name, params, results })
    await reload()
    return id
  }, [studyId, baseStudy, reload])

  /** Atualiza params e recalcula resultados */
  const update = useCallback(async (id: string, name: string, params: ScenarioParams): Promise<void> => {
    const results = baseStudy ? calcScenarioResults(baseStudy, params) : undefined
    await updateScenario(id, { name, params, results })
    setScenarios((prev) => prev.map((s) =>
      s.id === id ? { ...s, name, params, results } : s
    ))
  }, [baseStudy])

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteScenario(id)
    setScenarios((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const duplicate = useCallback(async (sc: Scenario): Promise<void> => {
    await duplicateScenario(sc)
    await reload()
  }, [reload])

  /** Recalcula todos os cenarios (ex: apos salvar o estudo base) */
  const recalcAll = useCallback(async (): Promise<void> => {
    if (!baseStudy) return
    for (const sc of scenarios) {
      if (!sc.id) continue
      const results = calcScenarioResults(baseStudy, sc.params)
      if (results) await saveScenarioResults(sc.id, results)
    }
    migrationDoneRef.current = false  // permite nova checagem após recalc total
    await reload()
  }, [baseStudy, scenarios, reload])

  return {
    scenarios,
    loading,
    error,
    reload,
    add,
    update,
    remove,
    duplicate,
    recalcAll,
    calcScenarioResults: (p: ScenarioParams) =>
      baseStudy ? calcScenarioResults(baseStudy, p) : undefined,
  }
}
