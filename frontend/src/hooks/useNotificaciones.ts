// frontend/src/hooks/useNotificaciones.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { notificacionesApi, type Notificacion } from '@/api/notificaciones-api'
import { wsClient } from '@/services/websocket'

export function useNotificaciones() {
  const [items, setItems]       = useState<Notificacion[]>([])
  const [loading, setLoading]   = useState(false)
  const [unread, setUnread]     = useState(0)
  const mountedRef               = useRef(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await notificacionesApi.listar()
      if (!mountedRef.current) return
      setItems(data)
      setUnread(data.filter((n: Notificacion) => !n.leida).length)
    } catch {
      // silencioso
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    cargar()
    return () => { mountedRef.current = false }
  }, [cargar])

  // Escucha notificaciones en tiempo real por WebSocket
  useEffect(() => {
    const unsub = wsClient.on('notificacion.nueva', (payload: unknown) => {
      const n = payload as Notificacion
      setItems((prev) => [n, ...prev].slice(0, 100))
      setUnread((c) => c + 1)
    })
    return unsub
  }, [])

  const marcarLeida = useCallback(async (id: string) => {
    // Optimistic update
    setItems((prev) => {
      const yaLeida = prev.find((n) => n.id === id)?.leida ?? true
      if (!yaLeida) setUnread((c) => Math.max(0, c - 1))
      return prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    })
    try {
      await notificacionesApi.marcarLeida(id)
    } catch {
      // Revertir estado recargando desde el servidor
      cargar()
    }
  }, [cargar])

  const marcarTodasLeidas = useCallback(async () => {
    await notificacionesApi.marcarTodasLeidas()
    setItems((prev) => prev.map((n) => ({ ...n, leida: true })))
    setUnread(0)
  }, [])

  return { items, loading, unread, marcarLeida, marcarTodasLeidas, recargar: cargar }
}
