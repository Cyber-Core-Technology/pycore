import { Bell, BellOff, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/**
 * Banner que invita al usuario a activar notificaciones push.
 * Se muestra una sola vez (se descarta guardando en localStorage).
 * Se usa en la página de Notificaciones / Configuración.
 */
export function PushPermissionBanner() {
  const { t } = useTranslation()
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pycore_push_dismissed') === '1'
  )

  function dismiss() {
    localStorage.setItem('pycore_push_dismissed', '1')
    setDismissed(true)
  }

  // No mostrar si: no soportado, ya tiene permiso o fue descartado
  if (permission === 'unsupported') return null
  if (permission === 'denied')      return null
  if (dismissed && !isSubscribed)   return null

  if (isSubscribed) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Bell size={18} className="text-emerald-500 flex-shrink-0" />
        <div className="flex-1">
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {t('push.activated')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {t('push.activatedDesc')}
          </p>
        </div>
        <button
          onClick={unsubscribe}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'var(--surface-hover)',
            color:      'var(--text-secondary)',
            border:     '1px solid var(--border)',
            cursor:     isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <BellOff size={12} />
          {t('push.deactivate')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border"
      style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
      <Bell size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          {t('push.enableTitle')}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
          {t('push.enableSubtitle')}
        </p>
        <button
          onClick={subscribe}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: isLoading ? 'rgba(16,185,129,0.4)' : 'var(--color-primary)',
            color:      'var(--color-primary-text)',
            border:     'none',
            cursor:     isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? t('push.activating') : t('push.enable')}
        </button>
      </div>
      <button
        onClick={dismiss}
        className="p-1 rounded transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label={t('push.dismiss')}
      >
        <X size={14} />
      </button>
    </div>
  )
}
