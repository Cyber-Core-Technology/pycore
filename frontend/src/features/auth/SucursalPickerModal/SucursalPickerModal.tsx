import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Building2, MapPin } from 'lucide-react'
import type { Sucursal } from '@/types/auth.types'

interface Props {
  sucursales: Sucursal[]
  onSelect: (sucursal: Sucursal) => void
}

export function SucursalPickerModal({ sucursales, onSelect }: Props) {
  const { t } = useTranslation()

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: '50%', margin: '0 auto 12px',
              background: 'rgba(24,174,145,0.12)',
              border: '1px solid rgba(24,174,145,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Building2 size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
            {t('twoFa.sucursalTitle')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {t('twoFa.sucursalSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sucursales.map((s) => (
            <button
              key={s.id_sucursal}
              type="button"
              onClick={() => onSelect(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg)', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.background = 'rgba(24,174,145,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--bg)'
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(24,174,145,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {s.nombre}
                  {s.es_principal && (
                    <span
                      style={{
                        marginLeft: 8, fontSize: 10, fontWeight: 600,
                        padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(24,174,145,0.15)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {t('twoFa.sucursalPrincipal')}
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  {t('twoFa.sucursalCode')} {s.codigo}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
