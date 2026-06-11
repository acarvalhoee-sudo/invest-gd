/**
 * useStudies.ts
 * Hook para gerenciar a lista de estudos
 */

import { useState, useEffect, useCallback } from 'react'
import { listStudies, deleteStudy, duplicateStudy } from '@/services/studyService'
import type { Study } from '@/types/study'
import toast from 'react-hot-toast'

export function useStudies() {
  const [studies,  setStudies]  = useState<Study[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listStudies()
      setStudies(data)
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar estudos. Verifique a configuração do Firebase.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(id: string): Promise<boolean> {
    try {
      await deleteStudy(id)
      setStudies((prev) => prev.filter((s) => s.id !== id))
      toast.success('Estudo excluído.')
      return true
    } catch {
      toast.error('Erro ao excluir estudo.')
      return false
    }
  }

  async function duplicate(id: string): Promise<string | null> {
    try {
      const newId = await duplicateStudy(id)
      await load()
      toast.success('Estudo duplicado.')
      return newId
    } catch {
      toast.error('Erro ao duplicar estudo.')
      return null
    }
  }

  return { studies, loading, error, reload: load, remove, duplicate }
}
