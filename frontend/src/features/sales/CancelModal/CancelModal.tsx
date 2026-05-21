import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useCancelarVenta } from '@/hooks/useSales'
import { AlertTriangle, X } from 'lucide-react'
import type { Venta } from '@/types/sales.types'

interface Props {
  venta:     Venta
  onClose:   () => void
  onSuccess: () => void
}

export function CancelModal({ venta, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const [motivo, setMotivo] = useState('')
  const [error,  setError]  = useState('')
  const { mutateAsync, isPending } = useCancelarVenta()

  const handleCancel = async () => {
    if (!motivo.trim()) {
      setError(t('sales.cancelReasonRequired'))
      return
    }
    try {
      await mutateAsync({ id: String(venta.id_venta), motivo })
      onSuccess()
    } catch {
      setError(t('sales.cancelError'))
    }
  }

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(440px, 90%)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          zIndex: 9999,
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          animation: 'modalEnter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--color-error-bg)',
            }}>
              <AlertTriangle size={18} style={{ color: 'var(--color-error)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('sales.cancelTitle')}</p>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 2 }}>
                {venta.folio}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 4, borderRadius: 8, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {t('sales.cancelWarning')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
            {t('sales.cancelReason')}
          </label>
          <textarea
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setError('') }}
            placeholder={t('sales.cancelReasonPlaceholder')}
            rows={3}
            style={{
              width: '100%', padding: '10px 14px',
              borderRadius: 8, fontSize: 13, outline: 'none', resize: 'none',
              background: 'var(--surface-hover)',
              border: `1px solid ${error ? 'var(--color-error)' : 'var(--border)'}`,
              color: 'var(--text)', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
          />
          {error && <p style={{ fontSize: 12, color: '#F87171' }}>{error}</p>}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--surface-hover)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: isPending ? 'rgba(239,68,68,0.5)' : 'var(--color-error)',
              color: '#fff', border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {isPending ? t('sales.cancelling') : t('sales.confirmCancel')}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
