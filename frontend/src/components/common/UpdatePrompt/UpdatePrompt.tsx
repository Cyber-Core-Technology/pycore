import { useTranslation } from 'react-i18next'
import { usePWA } from '@/hooks/usePWA'

export function UpdatePrompt() {
  const { t } = useTranslation()
  const { offlineReady, needsUpdate, updateSW, close } = usePWA()

  if (!offlineReady && !needsUpdate) return null

  return (
    <div
      style={{ animation: 'fadeIn 0.3s ease-out', bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-white/10 bg-[#0F1E1A] text-white text-sm max-w-sm w-[calc(100%-2rem)]"
    >
      {needsUpdate ? (
        <>
          <span className="flex-1">{t('update.newVersion')}</span>
          <button
            onClick={updateSW}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors"
          >
            {t('update.update')}
          </button>
          <button
            onClick={close}
            className="p-1 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <span className="text-emerald-400">✓</span>
          <span className="flex-1">{t('update.offlineReady')}</span>
          <button
            onClick={close}
            className="p-1 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </>
      )}
    </div>
  )
}
