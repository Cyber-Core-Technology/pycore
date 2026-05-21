import { Download, Share, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useInstallPrompt }   from '@/hooks/useInstallPrompt'

export function InstallBanner() {
  const { t } = useTranslation()
  const { canInstall, isIOS, isStandalone, install, dismissed, dismiss } = useInstallPrompt()

  if (isStandalone)                   return null
  if (dismissed)                      return null
  if (!canInstall && !isIOS)          return null

  return (
    <div
      role="complementary"
      aria-label={t('install.title')}
      style={{
        position:        'fixed',
        bottom:          0,
        left:            0,
        right:           0,
        zIndex:          30,
        padding:         '12px 16px',
        paddingBottom:   'calc(12px + env(safe-area-inset-bottom))',
        background:      'var(--surface)',
        borderTop:       '1px solid var(--border)',
        display:         'flex',
        alignItems:      'center',
        gap:             12,
        boxShadow:       '0 -4px 24px rgba(0,0,0,0.12)',
        animation:       'slideUp 0.3s ease-out',
      }}
    >
      <img
        src="/web-app-manifest-192x192.png"
        alt="PyCore ERP"
        style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {t('install.title')}
        </p>
        {isIOS ? (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {t('install.iosTap')} <Share size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('install.iosThen')}
            &nbsp;<strong>{t('install.iosInstructions')}</strong>
          </p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {t('install.quickAccess')}
          </p>
        )}
      </div>

      {!isIOS && (
        <button
          onClick={install}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '8px 14px',
            borderRadius: 8,
            fontSize:     13,
            fontWeight:   600,
            background:   'var(--color-primary)',
            color:        'var(--color-primary-text)',
            border:       'none',
            cursor:       'pointer',
            flexShrink:   0,
            whiteSpace:   'nowrap',
          }}
        >
          <Download size={14} />
          {t('install.install')}
        </button>
      )}

      <button
        onClick={dismiss}
        style={{
          padding:    4,
          borderRadius: 6,
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          color:      'var(--text-secondary)',
          flexShrink: 0,
        }}
        aria-label={t('common.close')}
      >
        <X size={16} />
      </button>
    </div>
  )
}
