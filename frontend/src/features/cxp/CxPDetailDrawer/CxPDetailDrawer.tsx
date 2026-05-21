import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Link } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCxPDetalle, useCancelarCxP } from '@/hooks/useCxP'
import type { EstadoCxP } from '@/types/finanzas.types'

interface Props {
  id: number
  onClose: () => void
  canCancelar: boolean
}

const ESTADO_BG_COLOR: Record<EstadoCxP, { bg: string; color: string }> = {
  pendiente:      { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)' },
  pagada_parcial: { bg: 'var(--color-info-bg)',  color: 'var(--color-info)' },
  pagada:         { bg: 'var(--color-success-bg)',   color: 'var(--color-success)' },
  vencida:        { bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
  cancelada:      { bg: 'rgba(107,114,128,0.12)', color: '#6B7280' },
}

function EstadoBadge({ estado }: { estado: EstadoCxP }) {
  const { t } = useTranslation()
  const cfg = ESTADO_BG_COLOR[estado] ?? { bg: 'var(--surface-hover)', color: 'var(--text-secondary)' }
  return (
    <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, ...cfg }}>
      {t(`cxpDetail.estados.${estado}`, { defaultValue: estado })}
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const fmt = (val: string) =>
  parseFloat(val).toLocaleString(undefined, { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })

export function CxPDetailDrawer({ id, onClose, canCancelar }: Props) {
  const { t } = useTranslation()
  const { data: cxp, isLoading } = useCxPDetalle(id)
  const cancelar = useCancelarCxP()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelError, setCancelError]     = useState<string | null>(null)

  const handleCancelar = async () => {
    setCancelError(null)
    try {
      await cancelar.mutateAsync(id)
      setConfirmCancel(false)
      onClose()
    } catch {
      setCancelError(t('cxpDetail.cancelError'))
    }
  }

  const canShowCancel =
    canCancelar &&
    cxp &&
    (cxp.estado === 'pendiente' || cxp.estado === 'pagada_parcial')

  const montoPagado = cxp
    ? parseFloat(cxp.monto_original) - parseFloat(cxp.saldo_pendiente)
    : 0

  const pct = cxp
    ? Math.min(100, (montoPagado / parseFloat(cxp.monto_original)) * 100)
    : 0

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.25)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        width: 'min(480px, 100vw)',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {t('cxpDetail.title')}
            </h2>
            {cxp && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, fontFamily: 'monospace' }}>
                {cxp.folio}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ padding: 8, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: 44, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : !cxp ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: 40, fontSize: 14 }}>
              {t('cxpDetail.notFound')}
            </div>
          ) : (
            <>
              {/* Estado + vencida warning */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <EstadoBadge estado={cxp.estado} />
                {cxp.esta_vencida && cxp.estado !== 'cancelada' && cxp.estado !== 'pagada' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle size={14} color="#EF4444" />
                    <span style={{ fontSize: 12, color: 'var(--color-error)', fontWeight: 600 }}>
                      {t('cxpDetail.overdueWarning')}
                    </span>
                  </div>
                )}
              </div>

              {/* Proveedor */}
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('cxpDetail.supplierLabel')}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{cxp.nombre_proveedor}</p>
                {cxp.folio_compra && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <Link size={11} color="var(--text-secondary)" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {t('cxpDetail.purchaseLink')} {cxp.folio_compra}
                    </span>
                  </div>
                )}
              </div>

              {/* Montos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>{t('cxpDetail.originalAmount')}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{fmt(cxp.monto_original)}</p>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>{t('cxpDetail.pendingBalance')}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: parseFloat(cxp.saldo_pendiente) > 0 ? 'var(--color-error)' : 'var(--color-success)', margin: 0 }}>{fmt(cxp.saldo_pendiente)}</p>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>{t('cxpDetail.paidAmount')}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)', margin: 0 }}>
                    {montoPagado.toLocaleString(undefined, { style: 'currency', currency: 'MXN' })}
                  </p>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{t('cxpDetail.paymentProgress')}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)' }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--border)' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: pct === 100 ? 'var(--color-success)' : pct > 50 ? 'var(--color-info)' : 'var(--color-warning)', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DetailRow label={t('cxpDetail.emissionDate')} value={fmtDate(cxp.fecha_emision)} />
                <DetailRow
                  label={t('cxpDetail.dueDate')}
                  value={
                    <span style={{ color: cxp.esta_vencida ? 'var(--color-error)' : 'var(--text)', fontWeight: cxp.esta_vencida ? 700 : 500 }}>
                      {fmtDate(cxp.fecha_vencimiento)}
                    </span>
                  }
                />
              </div>

              {/* Notas */}
              {cxp.notas && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('cxpDetail.notesLabel')}</p>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{cxp.notas}</p>
                </div>
              )}

              {/* Inline cancel confirm */}
              {canShowCancel && !confirmCancel && (
                <button
                  onClick={() => setConfirmCancel(true)}
                  style={{ marginTop: 8, padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: 'var(--color-error)', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }}
                >
                  {t('cxpDetail.cancelDoc')}
                </button>
              )}

              {canShowCancel && confirmCancel && (
                <div style={{ padding: '16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-error)', margin: 0 }}>{t('cxpDetail.cancelTitle')}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {t('cxpDetail.cancelDesc')}
                      </p>
                    </div>
                  </div>
                  {cancelError && (
                    <p style={{ fontSize: 12, color: 'var(--color-error)', margin: 0 }}>{cancelError}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setConfirmCancel(false); setCancelError(null) }}
                      style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}
                    >
                      {t('cxpDetail.cancelBtn')}
                    </button>
                    <button
                      onClick={handleCancelar}
                      disabled={cancelar.isPending}
                      style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: cancelar.isPending ? 'var(--border)' : 'var(--color-error)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: cancelar.isPending ? 'not-allowed' : 'pointer' }}
                    >
                      {cancelar.isPending ? t('cxpDetail.cancelling') : t('cxpDetail.confirmCancelBtn')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
