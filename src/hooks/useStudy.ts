/**
 * useStudy.ts
 * Hook para carregar, salvar e recalcular um estudo específico
 */

import { useEffect, useState, useCallback } from 'react'
import { buscarEstudo, atualizarEstudo } from '../services/firestoreService'
import { calcularViabilidade } from '../calculations/viabilityEngine'
import type { Estudo, ResultadosEstudo } from '../types/studyTypes'

export function useStudy(id: string | undefined) {
  const [estudo,   setEstudo]  = useState<Estudo | null>(null)
  const [result,   setResult]  = useState<ResultadosEstudo | null>(null)
  const [loading,  setLoading] = useState(true)
  const [error,    setError]   = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!id || id === 'novo') { setLoading(false); return }
    try {
      setLoading(true)
      const e = await buscarEstudo(id)
      if (!e) { setError('Estudo não encontrado.'); return }
      setEstudo(e)
      const r = e.resultados ?? calcularViabilidade(e.dadosUsina, e.premissas, e.parametros)
      setResult(r)
    } catch {
      setError('Erro ao carregar estudo.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function salvarResultados(e: Estudo, r: ResultadosEstudo) {
    if (!e.id) return
    await atualizarEstudo(e.id, { resultados: r })
    setResult(r)
  }

  return { estudo, result, loading, error, reload: carregar, salvarResultados }
}
