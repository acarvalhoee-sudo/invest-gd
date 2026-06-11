/**
 * studyService.ts
 * CRUD completo de estudos no Firestore
 *
 * Coleção principal: "studies"
 * Sem autenticação — acesso público conforme regras Firestore
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Study } from '@/types/study'

const COL = 'studies'

// ─── Conversão Firestore ↔ Study ──────────────────────────────

function docToStudy(id: string, data: Record<string, unknown>): Study {
  return {
    ...(data as Omit<Study, 'id' | 'criadoEm' | 'atualizadoEm'>),
    id,
    criadoEm:     toISO(data.criadoEm),
    atualizadoEm: toISO(data.atualizadoEm),
  }
}

function toISO(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString()
  if (typeof val === 'string')  return val
  return new Date().toISOString()
}

// ─── Listar ──────────────────────────────────────────────────

export async function listStudies(): Promise<Study[]> {
  const q    = query(collection(db, COL), orderBy('criadoEm', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToStudy(d.id, d.data() as Record<string, unknown>))
}

// ─── Buscar por ID ───────────────────────────────────────────

export async function getStudy(id: string): Promise<Study | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return docToStudy(snap.id, snap.data() as Record<string, unknown>)
}

// ─── Criar ───────────────────────────────────────────────────

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

// ─── Atualizar ───────────────────────────────────────────────

export async function updateStudy(
  id: string,
  data: Partial<Omit<Study, 'id' | 'criadoEm'>>
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    atualizadoEm: serverTimestamp(),
  })
}

// ─── Excluir ─────────────────────────────────────────────────

export async function deleteStudy(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

// ─── Duplicar ────────────────────────────────────────────────

export async function duplicateStudy(id: string): Promise<string> {
  const original = await getStudy(id)
  if (!original) throw new Error('Estudo não encontrado')
  const { id: _id, criadoEm: _c, atualizadoEm: _a, ...rest } = original
  return createStudy({
    ...rest,
    dadosUsina: {
      ...rest.dadosUsina,
      nomeEstudo: `${rest.dadosUsina.nomeEstudo} (Cópia)`,
    },
  })
}
