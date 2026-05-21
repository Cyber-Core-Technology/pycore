import { useEffect, useState } from 'react'

interface NetworkStatus {
  isOnline:         boolean
  isOffline:        boolean
  justReconnected:  boolean   // true durante 3s al recuperar conexión
}

/**
 * Reactivo al estado de red del dispositivo.
 * - isOffline / isOnline: estado actual
 * - justReconnected: true durante 3 s al volver a estar en línea
 *   (útil para mostrar un toast de "conexión restaurada")
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline,        setIsOnline]        = useState(navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function onOnline() {
      setIsOnline(true)
      setJustReconnected(true)
      reconnectTimer = setTimeout(() => setJustReconnected(false), 3000)
    }

    function onOffline() {
      setIsOnline(false)
      setJustReconnected(false)
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  return { isOnline, isOffline: !isOnline, justReconnected }
}
