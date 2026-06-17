import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Printer, Download, Mail, Send, Loader2, CheckCircle2 } from 'lucide-react'
import type { Venta } from '@/types/sales.types'
import type { Empresa } from '@/types/auth.types'
import { buildTicketHTML } from '@/utils/printTicket'
import { salesApi } from '@/api/sales-api'

interface Props {
  venta:   Venta
  empresa: Empresa
  onClose: () => void
}

type EmailStatus = 'idle' | 'sending' | 'sent' | 'error'

export function TicketPreviewModal({ venta, empresa, onClose }: Props) {
  const { t } = useTranslation()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const html = buildTicketHTML(venta, empresa)

  const [showEmail, setShowEmail] = useState(false)
  const [email,     setEmail]     = useState('')
  const [status,    setStatus]    = useState<EmailStatus>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')

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

  const handleSendEmail = async () => {
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await salesApi.enviarTicket(venta.id_venta, email.trim())
      setEmail(res.email)
      setStatus('sent')
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.error ??
        err?.response?.data?.email?.[0] ??
        t('sales.emailTicketError'),
      )
      setStatus('error')
    }
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
              onClick={() => setShowEmail((v) => !v)}
              title={t('sales.emailTicket')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: showEmail ? 'rgba(59,130,246,0.12)' : 'var(--surface-hover)',
                color: showEmail ? '#3B82F6' : 'var(--text)',
                border: `1px solid ${showEmail ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              <Mail size={13} />
              {t('sales.emailTicket')}
            </button>

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

        {showEmail && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-hover)',
            flexShrink: 0,
          }}>
            {status === 'sent' ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: '#10B981', fontWeight: 500,
              }}>
                <CheckCircle2 size={16} />
                {t('sales.emailTicketSent', { email })}
              </div>
            ) : (
              <>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  {t('sales.emailTicketLabel')}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && status !== 'sending') handleSendEmail() }}
                    placeholder={t('sales.emailTicketPlaceholder')}
                    autoFocus
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                      background: 'var(--surface)', color: 'var(--text)',
                      border: '1px solid var(--border)', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={status === 'sending'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: '#3B82F6', color: '#fff', border: 'none',
                      cursor: status === 'sending' ? 'default' : 'pointer',
                      opacity: status === 'sending' ? 0.7 : 1, whiteSpace: 'nowrap',
                    }}
                  >
                    {status === 'sending'
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Send size={14} />}
                    {t('sales.emailTicketSend')}
                  </button>
                </div>
                {status === 'error' && (
                  <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>{errorMsg}</p>
                )}
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {t('sales.emailTicketHint')}
                </p>
              </>
            )}
          </div>
        )}

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
