/**
 * firestoreService.ts
 * CRUD de estudos no Firestore
 *
 * Cada usuário só acessa seus próprios estudos (regra de segurança no Firestore).
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Estudo } from '../types/studyTypes'

const COLLECTION = 'studies'

// ─── Conversão de Timestamp ───────────────────

function timestampToDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return new Date()
}

function firestoreToEstudo(id: string, data: Record<string, unknown>): Estudo {
  return {
    ...(data as Omit<Estudo, 'id' | 'criadoEm' | 'atualizadoEm'>),
    id,
    criadoEm: timestampToDate(data.criadoEm),
    atualizadoEm: timestampToDate(data.atualizadoEm),
  }
}

// ─── Listar todos os estudos do usuário ───────

export async function listarEstudos(userId: string): Promise<Estudo[]> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('criadoEm', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => firestoreToEstudo(d.id, d.data() as Record<string, unknown>))
}

// ─── Buscar estudo por ID ─────────────────────

export async function buscarEstudo(id: string): Promise<Estudo | null> {
  const ref = doc(db, COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return firestoreToEstudo(snap.id, snap.data() as Record<string, unknown>)
}

// ─── Criar novo estudo ────────────────────────

export async function criarEstudo(estudo: Omit<Estudo, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...estudo,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  return docRef.id
}

// ─── Atualizar estudo ─────────────────────────

export async function atualizarEstudo(
  id: string,
  dados: Partial<Omit<Estudo, 'id' | 'userId' | 'criadoEm'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id)
  await updateDoc(ref, {
    ...dados,
    atualizadoEm: serverTimestamp(),
  })
}

// ─── Excluir estudo ───────────────────────────

export async function excluirEstudo(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

// ─── Duplicar estudo ──────────────────────────

export async function duplicarEstudo(id: string, userId: string): Promise<string> {
  const original = await buscarEstudo(id)
  if (!original) throw new Error('Estudo não encontrado')

  const { id: _id, criadoEm: _c, atualizadoEm: _a, ...resto } = original
  return criarEstudo({
    ...resto,
    userId,
    dadosUsina: {
      ...resto.dadosUsina,
      nomeEstudo: `${resto.dadosUsina.nomeEstudo} (Cópia)`,
    },
  })
}
