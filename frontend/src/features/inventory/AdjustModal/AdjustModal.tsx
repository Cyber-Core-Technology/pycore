import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useRegistrarAjuste } from '@/hooks/useInventory'
import { X } from 'lucide-react'
import type { StockItem } from '@/types/inventory.types'

interface Props {
  stockItem: StockItem
  onClose:   () => void
  onSuccess: () => void
}

export function AdjustModal({ stockItem, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const ajustar = useRegistrarAjuste()
  const [cantidadNueva, setCantidadNueva] = useState(stockItem.stock_actual)
  const [motivo,        setMotivo]        = useState(t('inventory.adjustReason'))
  const [error,         setError]         = useState('')

  const diferencia = Number(cantidadNueva) - Number(stockItem.stock_actual)

  const handleSubmit = async () => {
    setError('')
    if (cantidadNueva === '') return setError(t('inventory.quantityRequired'))
    if (Number(cantidadNueva) < 0) return setError(t('inventory.quantityNegativeError'))
    try {
      await ajustar.mutateAsync({
        producto_id:    stockItem.producto,
        sucursal_id:    stockItem.sucursal,
        variante_id:    stockItem.variante,
        cantidad_nueva: cantidadNueva,
        motivo,
      })
      onSuccess()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t('inventory.adjustError'))
    }
  }

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 9998 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(420px, 95vw)',
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid var(--border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        zIndex: 9999,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('inventory.adjustTitle')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {stockItem.producto_nombre}
              {stockItem.variante_nombre && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                  {stockItem.variante_nombre}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, display: 'flex', color: 'var(--text-secondary)', background: 'var(--surface-hover)', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
            {[
              { label: t('inventory.currentStock'),  value: Number(stockItem.stock_actual).toLocaleString('es-MX')    },
              { label: t('inventory.reservedStock'), value: Number(stockItem.stock_reservado).toLocaleString('es-MX') },
              { label: t('inventory.branch'),        value: stockItem.sucursal_nombre },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {t('inventory.newQuantity')}
            </label>
            <input
              type="number" min="0" step="0.01"
              value={cantidadNueva}
              onChange={(e) => setCantidadNueva(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 16, fontWeight: 600, outline: 'none', textAlign: 'right', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            {cantidadNueva !== '' && (
              <p style={{ fontSize: 12, marginTop: 6, color: diferencia === 0 ? 'var(--text-secondary)' : diferencia > 0 ? 'var(--color-success)' : 'var(--color-error)', textAlign: 'right' }}>
                {(() => {
                  const u = stockItem.unidad_abreviatura ?? 'u'
                  if (diferencia === 0) return t('inventory.noChange')
                  return diferencia > 0
                    ? `+${diferencia.toLocaleString('es-MX')} ${u}`
                    : `${diferencia.toLocaleString('es-MX')} ${u}`
                })()}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {t('inventory.adjustReason')}
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={t('inventory.adjustReasonPlaceholder')}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-error)', padding: '8px 12px', borderRadius: 8, background: 'var(--color-error-bg)' }}>⚠️ {error}</p>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={ajustar.isPending || diferencia === 0}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: ajustar.isPending || diferencia === 0 ? 'not-allowed' : 'pointer', opacity: ajustar.isPending || diferencia === 0 ? 0.6 : 1 }}
          >
            {ajustar.isPending ? t('inventory.saving') : t('inventory.confirmAdjust')}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
