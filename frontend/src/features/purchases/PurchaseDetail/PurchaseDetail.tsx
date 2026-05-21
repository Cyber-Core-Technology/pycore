import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useCompra, useConfirmarCompra, useCancelarCompra } from '@/hooks/usePurchases'
import { formatMXN } from '@/utils/formatters'
import { X, CheckCircle, XCircle, PackageCheck } from 'lucide-react'
import type { EstadoCompra } from '@/types/purchases.types'
import { ReceiveModal } from '../ReceiveModal/ReceiveModal'

const ESTADO_COLOR: Record<EstadoCompra, string> = {
  borrador:         '#9CA3AF',
  activo:           'var(--color-info)',
  recibida_parcial: 'var(--color-warning)',
  recibida:         'var(--color-success)',
  cancelada:        'var(--color-error)',
}

interface Props {
  idCompra: number   // AutoField integer — NO uuid
  onClose:  () => void
  onSuccess: () => void
}

export function PurchaseDetail({ idCompra, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const { data: compra, isLoading } = useCompra(idCompra)
  const confirmar = useConfirmarCompra(idCompra)
  const cancelar  = useCancelarCompra(idCompra)
  const [showReceive, setShowReceive] = useState(false)

  const handleConfirmar = async () => {
    if (!confirm(t('purchaseDetail.confirmDialog'))) return
    await confirmar.mutateAsync()
    onSuccess()
  }

  const handleCancelar = async () => {
    const motivo = prompt(t('purchaseDetail.cancelMotivo')) ?? ''
    await cancelar.mutateAsync(motivo)
    onSuccess()
  }

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 9998 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0,
        height: '100%', width: 'min(500px, 100vw)',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 9999, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.25s ease',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('purchaseDetail.title')}</p>
            {compra && (
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: 2 }}>
                {compra.folio}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Confirmar — solo en borrador */}
            {compra?.estado === 'borrador' && (
              <button
                onClick={handleConfirmar}
                disabled={confirmar.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: 'rgba(34,197,94,0.1)', color: 'var(--color-success)',
                  border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer',
                }}
              >
                <CheckCircle size={13} />
                {confirmar.isPending ? t('purchaseDetail.confirming') : t('purchaseDetail.confirm')}
              </button>
            )}
            {/* Recibir — en activo o recibida_parcial */}
            {(compra?.estado === 'activo' || compra?.estado === 'recibida_parcial') && (
              <button
                onClick={() => setShowReceive(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: 'rgba(59,130,246,0.1)', color: 'var(--color-info)',
                  border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer',
                }}
              >
                <PackageCheck size={13} />
                {t('purchaseDetail.receive')}
              </button>
            )}
            {/* Cancelar — en borrador o activo */}
            {(compra?.estado === 'borrador' || compra?.estado === 'activo') && (
              <button
                onClick={handleCancelar}
                disabled={cancelar.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: 'var(--color-error-bg)', color: 'var(--color-error)',
                  border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                }}
              >
                <XCircle size={13} />
                {cancelar.isPending ? t('purchaseDetail.cancelling') : t('purchaseDetail.cancel')}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center',
                color: 'var(--text-secondary)', background: 'var(--surface-hover)',
                border: 'none', cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 64, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : !compra ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('purchaseDetail.loadError')}</p>
            </div>
          ) : (
            <>
              {/* Info general */}
              <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  {t('purchaseDetail.generalInfo')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: t('purchaseDetail.estado'), value: (
                      <span style={{ color: ESTADO_COLOR[compra.estado], fontWeight: 600 }}>
                        {t(`purchaseDetail.estados.${compra.estado}`, { defaultValue: compra.estado })}
                      </span>
                    )},
                    { label: t('purchaseDetail.paymentMethod'), value: compra.metodo_pago ?? '—' },
                    { label: t('purchaseDetail.proveedor'),  value: compra.nombre_proveedor },
                    { label: t('purchaseDetail.sucursal'),   value: compra.nombre_sucursal },
                    { label: t('purchaseDetail.fechaCompra'), value: new Date(compra.fecha_compra + 'T12:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }) },
                    { label: t('purchaseDetail.fechaEntrega'), value: compra.fecha_entrega
                        ? new Date(compra.fecha_entrega + 'T12:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
                        : '—'
                    },
                    { label: t('purchaseDetail.numFactura'),    value: compra.numero_factura || '—' },
                    { label: t('purchaseDetail.ordenCompra'),  value: compra.orden_compra   || '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
                    </div>
                  ))}
                </div>
                {compra.notas && (
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('purchaseDetail.notes')}</p>
                    <p style={{ fontSize: 13, color: 'var(--text)' }}>{compra.notas}</p>
                  </div>
                )}
              </div>

              {/* Productos */}
              <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  {t('purchaseDetail.products')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {compra.detalles.map((d) => (
                    <div key={d.id_detalle} style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.nombre_producto}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          SKU: {d.sku_producto} · {d.cantidad} × {formatMXN(Number(d.precio_unitario))}
                          {Number(d.descuento) > 0 && ` − ${d.descuento}%`}
                        </p>
                        {/* Barra de recepción */}
                        {Number(d.cantidad_recibida) > 0 && (
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 999,
                                background: d.esta_completamente_recibida ? 'var(--color-success)' : 'var(--color-warning)',
                                width: `${(Number(d.cantidad_recibida) / Number(d.cantidad)) * 100}%`,
                              }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {d.cantidad_recibida}/{d.cantidad}
                            </span>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {formatMXN(Number(d.total))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 2 }}>
                  {t('purchaseDetail.summary')}
                </p>
                {[
                  { label: t('purchaseDetail.subtotal'),  value: formatMXN(Number(compra.subtotal))  },
                  { label: t('purchaseDetail.discount'), value: `− ${formatMXN(Number(compra.descuento))}` },
                  { label: t('purchaseDetail.taxes'), value: formatMXN(Number(compra.impuestos)) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>{t('purchaseDetail.total')}</span>
                  <span style={{ color: 'var(--color-primary)' }}>{formatMXN(Number(compra.total))}</span>
                </div>
                {Number(compra.saldo_pendiente) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500 }}>
                    <span style={{ color: '#F87171' }}>{t('purchaseDetail.pendingBalance')}</span>
                    <span style={{ color: '#F87171' }}>{formatMXN(Number(compra.saldo_pendiente))}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de recepción — montado sobre el mismo portal */}
      {showReceive && compra && (
        <ReceiveModal
          compra={compra}
          onClose={() => setShowReceive(false)}
          onSuccess={() => { setShowReceive(false); onSuccess() }}
        />
      )}
    </>,
    document.body
  )
}
