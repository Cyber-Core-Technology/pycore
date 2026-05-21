import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Gestiona el ciclo de vida del Service Worker:
 * - offlineReady: app lista para funcionar sin conexión
 * - needsUpdate: hay una nueva versión disponible
 * - updateSW: aplica la actualización y recarga la página
 * - close: descarta la notificación sin actualizar
 */
export function usePWA() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh:  [needsUpdate, setNeedsUpdate],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(sw) {
      // Verificar actualizaciones cada hora cuando la app está abierta
      if (sw) {
        setInterval(() => sw.update(), 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Error al registrar Service Worker:', error)
    },
  })

  function close() {
    setOfflineReady(false)
    setNeedsUpdate(false)
  }

  function updateSW() {
    updateServiceWorker(true)
  }

  return { offlineReady, needsUpdate, updateSW, close }
}
