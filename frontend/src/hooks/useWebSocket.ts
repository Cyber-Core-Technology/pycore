import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useWsStore }   from '@/store/wsStore'
import { wsClient }     from '@/services/websocket'

/**
 * Call once in the authenticated layout.
 * Connects the WS when the user is logged in, disconnects on logout.
 */
export function useWsConnection(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setStatus       = useWsStore((s) => s.setStatus)

  useEffect(() => {
    // Subscribe status changes to the store
    const unsubStatus = wsClient.onStatus(setStatus)

    if (isAuthenticated) {
      const token = localStorage.getItem('pycore_access')
      if (token) wsClient.connect(token)
    } else {
      wsClient.disconnect()
    }

    return () => {
      unsubStatus()
    }
  }, [isAuthenticated, setStatus])
}

/**
 * Subscribe to a specific domain event pushed from the backend.
 *
 * @example
 * useWsEvent('venta.creada', (payload) => refetchKpis())
 */
export function useWsEvent(
  eventName: string,
  handler:   (payload: unknown) => void,
): void {
  // Keep a stable ref to the handler so the effect doesn't re-run on every render
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const off = wsClient.on(eventName, (payload) => handlerRef.current(payload))
    return off
  }, [eventName])
}
