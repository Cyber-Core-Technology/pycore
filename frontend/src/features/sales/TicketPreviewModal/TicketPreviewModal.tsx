import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Printer, Download } from 'lucide-react'
import type { Venta } from '@/types/sales.types'
import type { Empresa } from '@/types/auth.types'
import { buildTicketHTML } from '@/utils/printTicket'

interface Props {
  venta:   Venta
  empresa: Empresa
  onClose: () => void
}

export function TicketPreviewModal({ venta, empresa, onClose }: Props) {
  const { t } = useTranslation()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const html = buildTicketHTML(venta, empresa)

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print()
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `ticket-${venta.folio}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10004 }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(520px, 96vw)',
          maxHeight: '90vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
          zIndex: 10005,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('sales.ticketTitle')}</p>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: 1 }}>
              {venta.folio}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleDownload}
              title={t('sales.download')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: 'var(--surface-hover)', color: 'var(--text)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <Download size={13} />
              {t('sales.download')}
            </button>

            <button
              onClick={handlePrint}
              title={t('sales.print')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: 'rgba(24,174,145,0.1)', color: 'var(--color-primary)',
                border: '1px solid rgba(24,174,145,0.2)', cursor: 'pointer',
              }}
            >
              <Printer size={13} />
              {t('sales.print')}
            </button>

            <button
              onClick={onClose}
              style={{
                padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center',
                color: 'var(--text-secondary)', background: 'var(--surface-hover)',
                border: 'none', cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflow: 'hidden',
          background: '#e5e7eb',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '20px 16px',
          overflowY: 'auto',
        }}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={`Ticket ${venta.folio}`}
            style={{
              border: 'none',
              width: '320px',
              height: '600px',
              background: '#fff',
              borderRadius: 4,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      </div>
    </>,
    document.body
  )
}
