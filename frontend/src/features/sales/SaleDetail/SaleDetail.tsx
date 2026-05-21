import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVentaDetalle } from '@/hooks/useSales'
import { formatMXN } from '@/utils/formatters'
import { X, XCircle, Printer, FileText, CreditCard, AlertCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { EstadoVenta, Venta } from '@/types/sales.types'
import { useAuthStore } from '@/store/authStore'
import { formatQty } from '@/utils/printTicket'
import { FacturaModal } from '../FacturaModal/FacturaModal'
import { TicketPreviewModal } from '../TicketPreviewModal/TicketPreviewModal'
import { CxCDetailDrawer } from '@/features/cxc/CxCDetailDrawer'
import { useCrearCxCDesdeVenta } from '@/hooks/useCxC'
import { usePermissions } from '@/hooks/usePermissions'

const ESTADO_COLOR: Record<EstadoVenta, string> = {
  borrador:  '#9CA3AF',
  activo:    'var(--color-success)',
  cancelado: 'var(--color-error)',
  pagado:    'var(--color-success)',
}

interface Props {
  id:        string
  onClose:   () => void
  onCancel:  (v: Venta) => void
  canCancel: boolean
}

export function SaleDetail({ id, onClose, onCancel, canCancel }: Props) {
  const { t } = useTranslation()
  const { data: venta, isLoading, refetch } = useVentaDetalle(id)
  const empresa = useAuthStore((s) => s.usuario?.empresa)
  const { hasPermission } = usePermissions()
  const [showFactura,  setShowFactura]  = useState(false)
  const [showTicket,   setShowTicket]   = useState(false)
  const [showCxC,      setShowCxC]      = useState(false)
  const [cxcError,     setCxcError]     = useState<string | null>(null)
  const crearCxC = useCrearCxCDesdeVenta()

  const handleCrearCxC = async () => {
    if (!venta) return
    setCxcError(null)
    try {
      await crearCxC.mutateAsync(venta.id_venta)
      await refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setCxcError(msg ?? t('saleDetail.cxcError'))
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.15)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />

      {/* Panel lateral derecho */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0,
          height: '100%',
          width: 'min(460px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          animation: 'slideInRight 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('saleDetail.title')}</p>
            {venta && (
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: 2 }}>
                {venta.folio}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {venta && empresa && (
              <button
                onClick={() => setShowTicket(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: 'rgba(24,174,145,0.1)', color: 'var(--color-primary)',
                  border: '1px solid rgba(24,174,145,0.2)', cursor: 'pointer',
                }}
              >
                <Printer size={13} />
                {t('saleDetail.ticket')}
              </button>
            )}
            {venta && empresa?.tipo_negocio && empresa.tipo_negocio !== 'informal' && (
              <button
                onClick={() => setShowFactura(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)',
                  border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer',
                }}
              >
                <FileText size={13} />
                {t('saleDetail.factura')}
              </button>
            )}
            {canCancel && venta?.estado === 'activo' && (
              <button
                onClick={() => onCancel(venta)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: 'var(--color-error-bg)', color: 'var(--color-error)',
                  border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                }}
              >
                <XCircle size={13} />
                {t('saleDetail.cancel')}
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
          ) : !venta ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('saleDetail.loadError')}</p>
            </div>
          ) : (
            <>
              {/* Info general */}
              <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  {t('saleDetail.generalInfo')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: t('saleDetail.estado'), value: (
                      <span style={{ color: ESTADO_COLOR[venta.estado], fontWeight: 600 }}>
                        {t(`saleDetail.estados.${venta.estado}`, { defaultValue: venta.estado })}
                      </span>
                    )},
                    { label: t('saleDetail.paymentMethod'), value: venta.metodo_pago },
                    { label: t('saleDetail.customer'),  value: venta.id_cliente ?? 'Mostrador' },
                    { label: t('saleDetail.seller'), value: venta.nombre_vendedor },
                    { label: t('saleDetail.date'), value: new Date(venta.fecha_venta).toLocaleDateString(undefined, {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })
                    },
                    { label: t('saleDetail.sucursal'), value: venta.nombre_sucursal },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
                    </div>
                  ))}
                </div>
                {venta.notas && (
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('saleDetail.notes')}</p>
                    <p style={{ fontSize: 13, color: 'var(--text)' }}>{venta.notas}</p>
                  </div>
                )}
              </div>

              {/* Productos */}
              <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  {t('saleDetail.products')}
                </p>
                {!venta.detalles || venta.detalles.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('saleDetail.noProducts')}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {venta.detalles.map((d) => (
                      <div key={d.id_detalle}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.nombre_producto}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {formatQty(d.cantidad)} × {formatMXN(Number(d.precio_unitario))}
                            {Number(d.descuento) > 0 && ` − ${d.descuento}%`}
                          </p>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginLeft: 12 }}>
                          {formatMXN(Number(d.total))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CxC — solo ventas a crédito */}
              {venta.metodo_pago === 'credito' && (
                <div style={{ borderRadius: 10, border: `1px solid ${venta.id_cxc ? 'rgba(24,174,145,0.3)' : 'rgba(245,158,11,0.3)'}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: venta.id_cxc ? 'rgba(24,174,145,0.04)' : 'rgba(245,158,11,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <CreditCard size={14} color={venta.id_cxc ? 'var(--color-primary)' : 'var(--color-warning)'} />
                      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
                        {t('saleDetail.cxcTitle')}
                      </p>
                    </div>
                    {venta.id_cxc ? (
                      <button
                        onClick={() => setShowCxC(true)}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {t('saleDetail.viewCxC')}
                      </button>
                    ) : hasPermission('finanzas.crear') && (
                      <button
                        onClick={handleCrearCxC}
                        disabled={crearCxC.isPending}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-warning)', background: 'none', border: 'none', cursor: crearCxC.isPending ? 'not-allowed' : 'pointer', padding: 0, opacity: crearCxC.isPending ? 0.6 : 1 }}
                      >
                        {crearCxC.isPending ? t('saleDetail.creatingCxC') : t('saleDetail.createCxC')}
                      </button>
                    )}
                  </div>
                  {venta.id_cxc ? (
                    <p style={{ fontSize: 12, color: 'var(--color-primary)', margin: 0 }}>
                      {t('saleDetail.cxcGenerated')} <strong>{formatMXN(Number(venta.saldo_pendiente))}</strong>
                    </p>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <AlertCircle size={13} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12, color: 'var(--color-warning)', margin: 0 }}>
                        {t('saleDetail.cxcMissing')}
                      </p>
                    </div>
                  )}
                  {cxcError && (
                    <p style={{ fontSize: 12, color: 'var(--color-error)', margin: 0 }}>{cxcError}</p>
                  )}
                </div>
              )}

              {/* Totales */}
              <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 2 }}>
                  {t('saleDetail.summary')}
                </p>
                {[
                  { label: t('saleDetail.subtotal'),  value: formatMXN(Number(venta.subtotal))  },
                  { label: t('saleDetail.discount'), value: `− ${formatMXN(Number(venta.descuento))}` },
                  { label: t('saleDetail.tax'),  value: formatMXN(Number(venta.impuestos)) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>{t('saleDetail.total')}</span>
                  <span style={{ color: 'var(--color-primary)' }}>{formatMXN(Number(venta.total))}</span>
                </div>
                {Number(venta.saldo_pendiente) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500 }}>
                    <span style={{ color: '#F87171' }}>{t('saleDetail.pendingBalance')}</span>
                    <span style={{ color: '#F87171' }}>{formatMXN(Number(venta.saldo_pendiente))}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showTicket && venta && empresa && (
        <TicketPreviewModal
          venta={venta}
          empresa={empresa}
          onClose={() => setShowTicket(false)}
        />
      )}

      {showFactura && venta && (
        <FacturaModal
          ventaId={venta.id_venta}
          folio={venta.folio}
          onClose={() => setShowFactura(false)}
        />
      )}

      {showCxC && venta?.id_cxc && (
        <CxCDetailDrawer
          id={venta.id_cxc}
          onClose={() => setShowCxC(false)}
          canCancelar={hasPermission('finanzas.crear')}
        />
      )}
    </>,
    document.body
  )
}
