import { useTranslation } from 'react-i18next'
import { useModules } from '@/hooks/useModules'
import type { ModuleKey } from '@/hooks/useModules'
import { PLAN_LABELS, MODULE_MIN_PLAN } from '@/hooks/useModules'
import { Lock, ArrowRight } from 'lucide-react'

interface Props {
  module: ModuleKey
  children: React.ReactNode
}

export function ModuleGuard({ module, children }: Props) {
  const { t } = useTranslation()
  const { hasModule } = useModules()

  if (hasModule(module)) return <>{children}</>

  const minPlan = MODULE_MIN_PLAN[module]
  const planLabel = minPlan ? PLAN_LABELS[minPlan] : 'superior'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: 20,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Lock size={32} style={{ color: "var(--color-warning)" }} />
      </div>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          {t('sidebar.moduleLocked')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 380 }}>
          {t('sidebar.moduleLockedDesc', { plan: planLabel })}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 10,
          background: 'var(--color-warning)',
          color: 'var(--color-primary-text)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'default',
        }}
      >
        <span>{t('sidebar.upgradePlan', { plan: planLabel })}</span>
        <ArrowRight size={16} />
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {t('sidebar.contactSupportInfo')}
      </p>
    </div>
  )
}
