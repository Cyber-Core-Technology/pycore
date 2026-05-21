/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, NavigationRoute }          from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin }        from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope

// ── Activación inmediata al hacer clic en "Actualizar" ─────────
// vite-plugin-pwa envía este mensaje desde updateServiceWorker(true)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Precaching del app shell ───────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Navegación (SPA fallback) ──────────────────────────────────
// No interceptar rutas de API, WS ni admin
const DENY_NAV = [/^\/api/, /^\/ws/, /^\/admin/, /^\/static/]
registerRoute(
  new NavigationRoute(
    new NetworkFirst({ cacheName: 'pycore-nav' }),
    { denylist: DENY_NAV }
  )
)

// ── Runtime caching ────────────────────────────────────────────

// Google Fonts (estilos) — CacheFirst 1 año
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'pycore-google-fonts-styles',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Google Fonts (archivos woff2) — CacheFirst 1 año
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'pycore-google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Catálogos — StaleWhileRevalidate 24 h
registerRoute(
  ({ url }) => url.pathname.includes('/api/v1/catalogs/'),
  new StaleWhileRevalidate({
    cacheName: 'pycore-api-catalogs',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Inventario — NetworkFirst 4 h de fallback
registerRoute(
  ({ url }) => url.pathname.includes('/api/v1/inventory/'),
  new NetworkFirst({
    cacheName: 'pycore-api-inventory',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 4 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Terceros (clientes/proveedores) — NetworkFirst 4 h de fallback
registerRoute(
  ({ url }) => url.pathname.includes('/api/v1/terceros/'),
  new NetworkFirst({
    cacheName: 'pycore-api-terceros',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 4 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Auth — NetworkOnly (NUNCA cachear tokens)
registerRoute(
  ({ url }) => url.pathname.includes('/api/v1/auth/'),
  new NetworkOnly()
)

// Datos financieros/transaccionales — NetworkOnly
registerRoute(
  ({ url }) => /\/api\/v1\/(sales|purchases|finance|hr|facturacion)\//.test(url.pathname),
  new NetworkOnly()
)

// ── Web Push ───────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: { title: string; body: string; icon?: string; badge?: string; data?: Record<string, unknown> }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'PyCore ERP', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon  ?? '/web-app-manifest-192x192.png',
      badge:   payload.badge ?? '/favicon-96x96.png',
      data:    payload.data  ?? {},
      vibrate: [100, 50, 100],
    } as NotificationOptions)
  )
})

// ── Notification click ─────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = (event.notification.data as { url?: string })?.url ?? '/dashboard'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => 'focus' in c)
        if (existing) {
          existing.focus()
          ;(existing as WindowClient).navigate(url)
        } else {
          self.clients.openWindow(url)
        }
      })
  )
})
