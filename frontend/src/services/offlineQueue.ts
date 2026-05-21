/**
 * Cola persistente de ventas pendientes usando IndexedDB.
 *
 * Se usa cuando el POS intenta crear una venta sin conexión.
 * Las entradas se consumen en orden FIFO al volver a estar en línea.
 *
 * Base de datos : pycore_offline  (versión 1)
 * Object store  : pending_sales
 */

import type { NuevaVentaInput } from '@/types/sales.types'

const DB_NAME    = 'pycore_offline'
const DB_VERSION = 1
const STORE      = 'pending_sales'

export interface PendingSale {
  id?:       number          // auto-increment
  payload:   NuevaVentaInput
  timestamp: number          // Date.now() al encolar
}

// ── Inicialización ─────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db    = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }

    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error)
  })
}

// ── API pública ────────────────────────────────────────────────

/** Agrega una venta a la cola. */
async function enqueue(payload: NuevaVentaInput): Promise<void> {
  const db    = await openDB()
  const entry: PendingSale = { payload, timestamp: Date.now() }
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add(entry)
    req.onsuccess = () => resolve()
    req.onerror   = (e) => reject((e.target as IDBRequest).error)
  })
}

/** Devuelve todas las ventas pendientes en orden de inserción. */
async function getAll(): Promise<PendingSale[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = (e) => resolve((e.target as IDBRequest<PendingSale[]>).result)
    req.onerror   = (e) => reject((e.target as IDBRequest).error)
  })
}

/** Elimina una entrada por su id. */
async function remove(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = (e) => reject((e.target as IDBRequest).error)
  })
}

/** Cuenta cuántas ventas hay en cola. */
async function count(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = (e) => resolve((e.target as IDBRequest<number>).result)
    req.onerror   = (e) => reject((e.target as IDBRequest).error)
  })
}

export const offlineQueue = { enqueue, getAll, remove, count }
