/**
 * scenarioService.ts - CRUD Firestore para cenarios (FASE 04)
 */
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, where, getDocs, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Scenario, ScenarioResults } from '@/types/scenario'

const COL = 'scenarios'

function fromDoc(d: { id: string; data(): Record<string,unknown> }): Scenario {
  const data = d.data()
  const ts = (k: string) => {
    const v = data[k]
    if (!v) return new Date().toISOString()
    if (v instanceof Timestamp) return v.toDate().toISOString()
    return String(v)
  }
  return {
    id:        d.id,
    studyId:   String(data.studyId ?? ''),
    name:      String(data.name ?? 'Cenario'),
    params:    (data.params as Scenario['params']) ?? {} as Scenario['params'],
    results:   (data.results as ScenarioResults | undefined) ?? undefined,
    createdAt: ts('createdAt'),
    updatedAt: ts('updatedAt'),
  }
}

export async function getScenarios(studyId: string): Promise<Scenario[]> {
  const q = query(collection(db, COL), where('studyId', '==', studyId))
  const snap = await getDocs(q)
  return snap.docs.map(fromDoc)
}

export async function createScenario(
  sc: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...sc,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateScenario(
  id: string,
  data: Partial<Omit<Scenario, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteScenario(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function duplicateScenario(sc: Scenario): Promise<string> {
  const copy = {
    studyId: sc.studyId,
    name:    sc.name + ' - Copia',
    params:  { ...sc.params },
    results: sc.results ? { ...sc.results } : undefined,
  }
  return createScenario(copy)
}

export async function saveScenarioResults(
  id: string, results: ScenarioResults
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    results,
    updatedAt: serverTimestamp(),
  })
}
