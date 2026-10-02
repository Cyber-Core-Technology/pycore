import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const tieneSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator

// Si la página nació ya controlada por un service worker, un cambio de
// controlador es una versión nueva. Si no, es la primera instalación y no hay
// nada que recargar.
const teniaControlador = tieneSW && !!navigator.serviceWorker.controller

let versionNuevaLista = false

/**
 * ¿Ya tomó el control un service worker más nuevo que el JS de esta página?
 * El router lo consulta en cada cambio de pantalla para recargar ahí, que es
 * un momento en el que no hay nada a medio capturar.
 */
export function hayVersionNueva() {
  return versionNuevaLista
}

/**
 * Gestiona el ciclo de vida del Service Worker:
 * - offlineReady: app lista para funcionar sin conexión
 * - needsUpdate: la versión nueva ya está instalada; falta recargar
 * - updateSW: recarga la página para usarla
 * - close: descarta la notificación (se recargará al cambiar de pantalla)
 *
 * El service worker nuevo se activa solo (ver `sw.ts`). Aquí sólo se decide
 * cuándo recargar: nunca de golpe, porque el ticket del mostrador vive en
 * memoria y una recarga a media venta lo borra.
 */
export function usePWA() {
  const [needsUpdate, setNeedsUpdate] = useState(versionNuevaLista)

  const {
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW({
    onRegistered(sw) {
      if (!sw) return
      // Sin conexión `update()` rechaza; no es un error que haya que reportar.
      const buscar = () => { sw.update().catch(() => {}) }
      // Cada hora con la app abierta, y cada vez que se vuelve a la pestaña:
      // una PWA instalada puede pasar días sin una navegación completa, que es
      // lo único que hace al navegador buscar una versión nueva por su cuenta.
      setInterval(buscar, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') buscar()
      })
    },
    onRegisterError(error) {
      console.error('[PWA] Error al registrar Service Worker:', error)
    },
  })

  useEffect(() => {
    if (!tieneSW) return
    const alCambiar = () => {
      if (!teniaControlador) return
      versionNuevaLista = true
      setNeedsUpdate(true)
    }
    navigator.serviceWorker.addEventListener('controllerchange', alCambiar)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', alCambiar)
  }, [])

  function close() {
    setOfflineReady(false)
    setNeedsUpdate(false)
  }

  function updateSW() {
    window.location.reload()
  }

  return { offlineReady, needsUpdate, updateSW, close }
}
