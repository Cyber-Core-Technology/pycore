import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useRecibirMercancia } from '@/hooks/usePurchases'
import { formatMXN } from '@/utils/formatters'
import { X, PackageCheck } from 'lucide-react'
import type { Compra } from '@/types/purchases.types'

interface Props {
  compra:    Compra
  onClose:   () => void
  onSuccess: () => void
}

export function ReceiveModal({ compra, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const recibir = useRecibirMercancia(compra.id_compra)

  // Estado local: cantidad a recibir por id_detalle (Integer)
  const [cantidades, setCantidades] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    compra.detalles.forEach((d) => {
      const pendiente = Number(d.cantidad) - Number(d.cantidad_recibida)
      init[d.id_detalle] = pendiente > 0 ? String(pendiente) : '0'
    })
    return init
  })

  const detallesPendientes = compra.detalles.filter(
    (d) => !d.esta_completamente_recibida
  )

  const handleSubmit = async () => {
    const items = detallesPendientes
      .map((d) => ({
        id_detalle:        d.id_detalle,          // Integer — AutoField
        cantidad_recibida: cantidades[d.id_detalle] ?? '0',
      }))
      .filter((item) => Number(item.cantidad_recibida) > 0)

    if (items.length === 0) {
      alert(t('receiveModal.alertMinQty'))
      return
    }

    await recibir.mutateAsync({ items })
    onSuccess()
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', zIndex: 10000,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid var(--border)',
        width: 'min(480px, 95%)', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('receiveModal.title')}</p>
            <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: 2 }}>{compra.folio}</p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, display: 'flex', color: 'var(--text-secondary)', background: 'var(--surface-hover)', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Productos pendientes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {detallesPendientes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
              <span style={{ fontSize: 32 }}>✅</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('receiveModal.allReceived')}</p>
            </div>
          ) : (
            detallesPendientes.map((d) => {
              const pendiente = Number(d.cantidad) - Number(d.cantidad_recibida)
              return (
                <div key={d.id_detalle} style={{
                  borderRadius: 10, border: '1px solid var(--border)',
                  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{d.nombre_producto}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        SKU: {d.sku_producto} · {formatMXN(Number(d.precio_unitario))} c/u
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('receiveModal.pending')}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-warning)' }}>{pendiente}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {t('receiveModal.qtyToReceive')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={String(pendiente)}
                      step="0.0001"
                      value={cantidades[d.id_detalle] ?? ''}
                      onChange={(e) => setCantidades((prev) => ({ ...prev, [d.id_detalle]: e.target.value }))}
                      style={{
                        flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13,
                        outline: 'none', textAlign: 'right',
                        background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)',
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {detallesPendientes.length > 0 && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13,
                background: 'var(--surface-hover)', border: '1px solid var(--border)',
                color: 'var(--text)', cursor: 'pointer',
              }}
            >
              {t('receiveModal.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={recibir.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                border: 'none', cursor: recibir.isPending ? 'not-allowed' : 'pointer',
                opacity: recibir.isPending ? 0.7 : 1,
              }}
            >
              <PackageCheck size={14} />
              {recibir.isPending ? t('receiveModal.registering') : t('receiveModal.confirmReceive')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
