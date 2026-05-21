import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Printer, FileText, Plus, X } from 'lucide-react'
import type { Venta } from '@/types/sales.types'
import type { Empresa } from '@/types/auth.types'
import { FacturaModal } from '../FacturaModal/FacturaModal'
import { TicketPreviewModal } from '../TicketPreviewModal/TicketPreviewModal'

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

interface Props {
  venta:        Venta
  empresa:      Empresa
  onClose:      () => void
  onNuevaVenta: () => void
}

export function SaleSuccessModal({ venta, empresa, onClose, onNuevaVenta }: Props) {
  const { t } = useTranslation()
  const [showFactura, setShowFactura] = useState(false)
  const [showTicket,  setShowTicket]  = useState(false)

  const METODO_LABEL: Record<string, string> = {
    efectivo:        t('sales.paymentMethods.cash'),
    tarjeta_debito:  t('sales.paymentMethods.debitCard'),
    tarjeta_credito: t('sales.paymentMethods.creditCard'),
    transferencia:   t('sales.paymentMethods.transfer'),
    cheque:          t('sales.paymentMethods.check'),
    credito:         t('sales.paymentMethods.credit'),
    otro:            t('sales.paymentMethods.other'),
  }

  const puedeFacturar =
    empresa.tipo_negocio !== undefined &&
    empresa.tipo_negocio !== 'informal'

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(440px, 95vw)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            padding: 6, borderRadius: 8, display: 'flex',
            color: 'var(--text-secondary)', background: 'var(--surface-hover)',
            border: 'none', cursor: 'pointer', zIndex: 1,
          }}
        >
          <X size={16} />
        </button>

        <div style={{ padding: '32px 28px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <CheckCircle2 size={48} color="#10B981" strokeWidth={1.5} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {t('sales.successTitle')}
          </h2>

          <div style={{
            display: 'inline-block',
            padding: '4px 14px', borderRadius: 999,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
            color: '#10B981', marginBottom: 20,
          }}>
            {venta.folio}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 12, marginBottom: 20,
            textAlign: 'left',
          }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('sales.total')}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>
                {formatMXN(parseFloat(venta.total))}
              </p>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('sales.paymentMethod')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}
              </p>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('sales.seller')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {venta.nombre_vendedor}
              </p>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('sales.branch')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {venta.nombre_sucursal}
              </p>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 16 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setShowTicket(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                border: 'none', cursor: 'pointer', width: '100%',
              }}
            >
              <Printer size={15} />
              {t('sales.viewTicket')}
            </button>

            {puedeFacturar && (
              <button
                onClick={() => setShowFactura(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)',
                  border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer', width: '100%',
                }}
              >
                <FileText size={15} />
                {t('sales.requestInvoice')}
              </button>
            )}

            <button
              onClick={onNuevaVenta}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                background: 'var(--surface-hover)', color: 'var(--text)',
                border: '1px solid var(--border)', cursor: 'pointer', width: '100%',
              }}
            >
              <Plus size={15} />
              {t('sales.newSale')}
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '6px', fontSize: 13, fontWeight: 400,
                background: 'none', color: 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
                width: '100%', textAlign: 'center',
              }}
            >
              {t('sales.close')}
            </button>
          </div>
        </div>
      </div>

      {showTicket && (
        <TicketPreviewModal
          venta={venta}
          empresa={empresa}
          onClose={() => setShowTicket(false)}
        />
      )}

      {showFactura && (
        <FacturaModal
          ventaId={venta.id_venta}
          folio={venta.folio}
          onClose={() => setShowFactura(false)}
        />
      )}
    </>,
    document.body
  )
}
