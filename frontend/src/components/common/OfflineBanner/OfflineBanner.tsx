import { WifiOff, Wifi } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export function OfflineBanner() {
  const { t } = useTranslation()
  const { isOffline, justReconnected } = useNetworkStatus()

  if (!isOffline && !justReconnected) return null

  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ animation: 'slideDown 0.25s ease-out', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-emerald-500 text-white text-sm font-medium py-2 px-4"
      >
        <Wifi size={14} />
        {t('offline.restored')}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      style={{ animation: 'slideDown 0.25s ease-out', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 text-amber-950 text-sm font-medium py-2 px-4"
    >
      <WifiOff size={14} />
      {t('offline.noConnection')}
    </div>
  )
}
