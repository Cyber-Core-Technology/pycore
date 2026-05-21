import { useCallback, useEffect, useState } from 'react'
import { pushApi } from '@/api/push-api'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

interface PushNotificationsState {
  permission:    PermissionState
  isSubscribed:  boolean
  isLoading:     boolean
  subscribe:     () => Promise<void>
  unsubscribe:   () => Promise<void>
}

/** Convierte la clave pública VAPID (base64url) a Uint8Array para pushManager.subscribe */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/**
 * Gestiona el ciclo de vida de las Web Push Notifications:
 * - Verifica soporte del navegador
 * - Solicita permiso al usuario
 * - Suscribe/desuscribe con el SW y el backend
 */
export function usePushNotifications(): PushNotificationsState {
  const supported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  const [permission,   setPermission]   = useState<PermissionState>(
    supported ? (Notification.permission as PermissionState) : 'unsupported'
  )
  const [isSubscribed,  setIsSubscribed]  = useState(false)
  const [isLoading,     setIsLoading]     = useState(false)

  // Verificar si ya hay suscripción activa al montar
  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    })
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported || isLoading) return
    setIsLoading(true)
    try {
      // 1. Pedir permiso
      const result = await Notification.requestPermission()
      setPermission(result as PermissionState)
      if (result !== 'granted') return

      // 2. Obtener clave pública VAPID del backend
      const { public_key } = await pushApi.getVapidKey()

      // 3. Suscribir via Push Manager del SW
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(public_key) as unknown as ArrayBuffer,
      })

      // 4. Enviar suscripción al backend
      await pushApi.subscribe(subscription.toJSON())
      setIsSubscribed(true)
    } catch (err) {
      console.error('[Push] Error al suscribirse:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supported, isLoading])

  const unsubscribe = useCallback(async () => {
    if (!supported || isLoading) return
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await pushApi.unsubscribe(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('[Push] Error al desuscribirse:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supported, isLoading])

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe }
}
