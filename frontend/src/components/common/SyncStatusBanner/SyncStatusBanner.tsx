import { useTranslation } from 'react-i18next'
import { usePOSSync } from '@/hooks/usePOSSync'

export function SyncStatusBanner() {
  const { t } = useTranslation()
  const { phase, pendingCount, syncedCount, errorCount } = usePOSSync()

  if (phase === 'idle') return null

  let bg      = ''
  let text    = ''
  let spinner = false

  switch (phase) {
    case 'pending':
      bg   = 'bg-blue-600'
      text = t('sync.pendingChanges', { count: pendingCount })
      break
    case 'syncing':
      bg      = 'bg-blue-600'
      spinner = true
      text    = t('sync.syncing') + ` (${syncedCount}/${pendingCount})`
      break
    case 'done':
      bg   = 'bg-emerald-600'
      text = t('sync.syncComplete')
      break
    case 'error':
      bg   = 'bg-rose-600'
      text = syncedCount > 0
        ? `${syncedCount} ${t('sync.sent')} · ${errorCount} ${t('sync.failed')}`
        : `${errorCount} ${t('sync.failedToSync')}`
      break
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ animation: 'fadeIn 0.3s ease-out', bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
      className={`fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg text-white text-sm font-medium max-w-sm w-[calc(100%-2rem)] ${bg}`}
    >
      {spinner && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
      )}
      <span>{text}</span>
    </div>
  )
}
