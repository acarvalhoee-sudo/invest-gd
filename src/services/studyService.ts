/**
 * studyService.ts — CRUD Firestore (Fase 2)
 * Inclui persistência dos resultados financeiros.
 */

import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { migrateStudy } from '@/types/study'
import type { Study } from '@/types/study'
import type { ResultadosFinanceiros } from '@/types/results'

const COL = 'studies'

function toISO(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString()
  if (typeof val === 'string')  return val
  return new Date().toISOString()
}

function docToStudy(id: string, data: Record<string, unknown>): Study {
  const raw = { ...data, id, criadoEm: toISO(data.criadoEm), atualizadoEm: toISO(data.atualizadoEm) }
  return migrateStudy(raw)
}

export async function listStudies(): Promise<Study[]> {
  const q    = query(collection(db, COL), orderBy('criadoEm', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToStudy(d.id, d.data() as Record<string, unknown>))
}

export async function getStudy(id: string): Promise<Study | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return docToStudy(snap.id, snap.data() as Record<string, unknown>)
}

export async function createStudy(
  study: Omit<Study, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...study,
    criadoEm:     serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  return ref.id
}

export async function updateStudy(
  id: string,
  data: Partial<Omit<Study, 'id' | 'criadoEm'>>
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    atualizadoEm: serverTimestamp(),
  })
}

export async function deleteStudy(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function duplicateStudy(id: string): Promise<string> {
  const original = await getStudy(id)
  if (!original) throw new Error('Estudo nao encontrado')
  const { id: _id, criadoEm: _c, atualizadoEm: _a, ...rest } = original
  return createStudy({
    ...rest,
    ativo: {
      ...rest.ativo,
      nomeEstudo: `${rest.ativo.nomeEstudo} (Copia)`,
    },
  })
}

/**
 * Salva os indicadores-resumo dos resultados financeiros no documento do estudo.
 * A tabela completa (AnoRow[]) NÃO é salva — é recalculada on-demand no cliente.
 * Armazena apenas os indicadores escalares para evitar documentos grandes.
 */
export async function saveResultados(
  studyId: string,
  res: ResultadosFinanceiros,
): Promise<void> {
  const indicadores = {
    resultados: {
      geracaoMediaMensal:  res.geracaoMediaMensal,
      receitaAnual:        res.receitaAnual,
      ebitdaAnual:         res.ebitdaAnual,
      capex:               res.capex,
      vpl:                 res.vpl,
      tir:                 res.tir,
      paybackSimples:      res.paybackSimples,
      paybackDescontado:   res.paybackDescontado,
      calculadoEm:         res.calculadoEm,
    },
  }
  await updateDoc(doc(db, COL, studyId), {
    ...indicadores,
    atualizadoEm: serverTimestamp(),
  })
}
