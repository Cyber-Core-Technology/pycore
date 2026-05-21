import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ROUTES } from '@/router/routes'
import { useTranslation } from 'react-i18next'

export function BackToConfig() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.CONFIGURACION)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        background: 'transparent', color: 'var(--text-secondary)',
        border: '1px solid var(--border)', cursor: 'pointer',
        marginBottom: 20, alignSelf: 'flex-start',
        transition: 'color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--color-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      aria-label={t('common.backToConfig')}
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {t('common.backToConfig')}
    </button>
  )
}
