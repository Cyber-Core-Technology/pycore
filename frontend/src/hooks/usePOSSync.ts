import { useEffect, useRef, useState } from 'react'
import { salesApi }         from '@/api/sales-api'
import { offlineQueue }     from '@/services/offlineQueue'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useQueryClient }   from '@tanstack/react-query'

export type SyncPhase =
  | 'idle'       // sin pendientes
  | 'pending'    // hay ventas en cola, sin conexión
  | 'syncing'    // enviando al servidor
  | 'done'       // terminó (éxito total o parcial)
  | 'error'      // todo falló

interface POSSyncState {
  phase:        SyncPhase
  pendingCount: number
  syncedCount:  number
  errorCount:   number
}

/**
 * Gestiona la sincronización de ventas pendientes.
 *
 * - Lee la cola de IndexedDB al montar
 * - Cuando `justReconnected` es true, drena la cola automáticamente
 *   usando `salesApi.crear` (el interceptor de axios renueva el JWT si expiró)
 * - Invalida las queries de ventas/stock al terminar
 */
export function usePOSSync(): POSSyncState {
  const qc               = useQueryClient()
  const { justReconnected, isOffline } = useNetworkStatus()
  const syncing          = useRef(false)

  const [state, setState] = useState<POSSyncState>({
    phase:        'idle',
    pendingCount: 0,
    syncedCount:  0,
    errorCount:   0,
  })

  // Cargar conteo inicial al montar
  useEffect(() => {
    offlineQueue.count().then((n) => {
      if (n > 0) setState((s) => ({ ...s, phase: 'pending', pendingCount: n }))
    })
  }, [])

  // Actualizar pendingCount cuando la app va offline
  useEffect(() => {
    if (!isOffline) return
    offlineQueue.count().then((n) => {
      setState((s) => ({
        ...s,
        phase:        n > 0 ? 'pending' : 'idle',
        pendingCount: n,
      }))
    })
  }, [isOffline])

  // Drenar cola al recuperar conexión
  useEffect(() => {
    if (!justReconnected || syncing.current) return

    async function drain() {
      syncing.current = true
      const entries = await offlineQueue.getAll()
      if (entries.length === 0) { syncing.current = false; return }

      setState((s) => ({ ...s, phase: 'syncing', pendingCount: entries.length, syncedCount: 0, errorCount: 0 }))

      let synced = 0
      let errors = 0

      for (const entry of entries) {
        try {
          await salesApi.crear(entry.payload)
          await offlineQueue.remove(entry.id!)
          synced++
          setState((s) => ({ ...s, syncedCount: synced }))
        } catch {
          errors++
        }
      }

      // Invalidar queries para reflejar las ventas nuevas
      qc.invalidateQueries({ queryKey: ['ventas'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['stock-alertas'] })

      const remaining = await offlineQueue.count()
      setState({
        phase:        errors > 0 ? 'error' : 'done',
        pendingCount: remaining,
        syncedCount:  synced,
        errorCount:   errors,
      })

      // Volver a idle después de 5 s
      setTimeout(() => {
        setState({ phase: 'idle', pendingCount: remaining, syncedCount: 0, errorCount: 0 })
      }, 5000)

      syncing.current = false
    }

    drain()
  }, [justReconnected, qc])

  return state
}
