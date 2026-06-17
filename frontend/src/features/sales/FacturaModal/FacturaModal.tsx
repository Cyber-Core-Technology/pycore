import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Download, Copy, Check } from 'lucide-react'
import { api } from '@/api/axios-config'
import { facturacionApi } from '@/api/facturacion-api'
import type { CFDI, SolicitarFacturaPayload } from '@/types/facturacion.types'

interface Props {
  ventaId: number
  folio:   string
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'

// ── Catálogos SAT completos ───────────────────────────────────────────────────

const REGIMENES = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios e Ingresos Asimilados' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Régimen de Enajenación o Adquisición de Bienes' },
  { value: '608', label: '608 - Demás ingresos' },
  { value: '610', label: '610 - Residentes en el Extranjero sin EP en México' },
  { value: '611', label: '611 - Ingresos por Dividendos' },
  { value: '612', label: '612 - PF con Actividades Empresariales y Profesionales' },
  { value: '614', label: '614 - Ingresos por intereses' },
  { value: '615', label: '615 - Régimen de los ingresos por obtención de premios' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Producción' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '622', label: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { value: '623', label: '623 - Opcional para Grupos de Sociedades' },
  { value: '624', label: '624 - Coordinados' },
  { value: '625', label: '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' },
]

const USOS_CFDI = [
  { value: 'G01', label: 'G01 - Adquisición de mercancias' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobilario y equipo de oficina por inversiones' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de computo y accesorios' },
  { value: 'I05', label: 'I05 - Dados, troqueles, moldes, matrices y herramental' },
  { value: 'I06', label: 'I06 - Comunicaciones telefónicas' },
  { value: 'I07', label: 'I07 - Comunicaciones satelitales' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'D01', label: 'D01 - Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'D02', label: 'D02 - Gastos médicos por incapacidad o discapacidad' },
  { value: 'D03', label: 'D03 - Gastos funerales' },
  { value: 'D04', label: 'D04 - Donativos' },
  { value: 'D05', label: 'D05 - Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
  { value: 'D06', label: 'D06 - Aportaciones voluntarias al SAR' },
  { value: 'D07', label: 'D07 - Primas por seguros de gastos médicos' },
  { value: 'D08', label: 'D08 - Gastos de transportación escolar obligatoria' },
  { value: 'D09', label: 'D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { value: 'D10', label: 'D10 - Pagos por servicios educativos (colegiaturas)' },
  { value: 'S01', label: 'S01 - Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 - Pagos' },
  { value: 'CN01', label: 'CN01 - Nómina' },
]

// ── Estilos compartidos ───────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  background: 'var(--surface-hover)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  boxSizing: 'border-box',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  marginBottom: 4,
  display: 'block',
}

// ── Componente principal ──────────────────────────────────────────────────────

export function FacturaModal({ ventaId, folio, onClose }: Props) {
  const { t } = useTranslation()
  const [rfc,         setRfc]         = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [regimen,     setRegimen]     = useState('626')
  const [usoCfdi,     setUsoCfdi]     = useState('G03')
  const [cp,          setCp]          = useState('')
  const [email,       setEmail]       = useState('')
  const [status,      setStatus]      = useState<Status>('idle')
  const [errorMsg,    setErrorMsg]    = useState('')
  const [cfdi,        setCfdi]        = useState<CFDI | null>(null)
  const [copied,      setCopied]      = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const payload: SolicitarFacturaPayload = {
        rfc_receptor:            rfc.toUpperCase().trim(),
        razon_social_receptor:   razonSocial.trim(),
        regimen_fiscal_receptor: regimen,
        uso_cfdi:                usoCfdi,
        codigo_postal_receptor:  cp,
        email_receptor:          email.trim(),
      }
      const res = await api.post<CFDI>(`/api/v1/sales/ventas/${ventaId}/factura/`, payload)
      setCfdi(res.data)
      setStatus('success')
    } catch (err: any) {
      setStatus('error')
      const data = err?.response?.data
      if (typeof data === 'string') {
        setErrorMsg(data)
      } else if (data?.detail) {
        setErrorMsg(data.detail)
      } else if (data) {
        setErrorMsg(JSON.stringify(data))
      } else {
        setErrorMsg(t('facturaModal.requestError'))
      }
    }
  }

  const copyUUID = () => {
    if (!cfdi?.uuid_sat) return
    navigator.clipboard.writeText(cfdi.uuid_sat)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDescargar = async (formato: 'pdf' | 'xml') => {
    if (!cfdi) return
    try {
      const url = await facturacionApi.urlDescarga(cfdi.id, formato)
      window.open(url, '_blank')
    } catch {
      // fallback a descarga directa por el servidor
      window.open(facturacionApi.urlDescargarDirecto(cfdi.id, formato), '_blank')
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 10002,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(540px, 95vw)',
          maxHeight: '90vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          zIndex: 10003,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('facturaModal.title')}</p>
            <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: 2 }}>
              {folio}
            </p>
          </div>
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* ── Éxito ─────────────────────────────────────────────────── */}
          {status === 'success' && cfdi ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Encabezado éxito */}
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <span style={{ fontSize: 40 }}>✅</span>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>
                  {t('facturaModal.stamped')}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}
                  dangerouslySetInnerHTML={{ __html: t('facturaModal.emailSent', { email: cfdi.email_receptor }) }}
                />
              </div>

              {/* UUID SAT */}
              {cfdi.uuid_sat && (
                <div style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    {t('facturaModal.fiscalFolio')}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ flex: 1, fontSize: 12, color: 'var(--text)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {cfdi.uuid_sat}
                    </code>
                    <button
                      onClick={copyUUID}
                      title={t('facturaModal.copyUuid')}
                      style={{
                        padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: copied ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                        color: copied ? '#10B981' : 'var(--text-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Totales */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
              }}>
                {[
                  { label: t('facturaModal.subtotal'), value: `$${parseFloat(cfdi.subtotal).toFixed(2)}` },
                  { label: t('facturaModal.iva'),      value: `$${parseFloat(cfdi.impuestos).toFixed(2)}` },
                  { label: t('facturaModal.total'),    value: `$${parseFloat(cfdi.total).toFixed(2)}` },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Descargas */}
              {(cfdi.xml_s3_key || cfdi.pdf_s3_key) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleDescargar('pdf')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    onClick={() => handleDescargar('xml')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'var(--surface-hover)', color: 'var(--text)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    <Download size={14} /> XML
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                style={{
                  padding: '8px', borderRadius: 8, fontSize: 13,
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                {t('facturaModal.close')}
              </button>
            </div>

          ) : (
            /* ── Formulario ──────────────────────────────────────────── */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* RFC */}
              <div>
                <label style={LABEL_STYLE}>{t('facturaModal.rfcLabel')}</label>
                <input
                  type="text"
                  required
                  maxLength={13}
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value.toUpperCase().replace(/[^A-ZÑ0-9&]/g, ''))}
                  placeholder={t('facturaModal.rfcPlaceholder')}
                  style={INPUT_STYLE}
                />
              </div>

              {/* Razón social */}
              <div>
                <label style={LABEL_STYLE}>{t('facturaModal.razonSocialLabel')}</label>
                <input
                  type="text"
                  required
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder={t('facturaModal.razonSocialPlaceholder')}
                  style={INPUT_STYLE}
                />
              </div>

              {/* Régimen fiscal */}
              <div>
                <label style={LABEL_STYLE}>{t('facturaModal.regimenLabel')}</label>
                <select
                  required
                  value={regimen}
                  onChange={(e) => setRegimen(e.target.value)}
                  style={INPUT_STYLE}
                >
                  {REGIMENES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Uso CFDI */}
              <div>
                <label style={LABEL_STYLE}>{t('facturaModal.usoCfdiLabel')}</label>
                <select
                  required
                  value={usoCfdi}
                  onChange={(e) => setUsoCfdi(e.target.value)}
                  style={INPUT_STYLE}
                >
                  {USOS_CFDI.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              {/* CP + Email en grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL_STYLE}>{t('facturaModal.cpLabel')}</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    pattern="\d{5}"
                    value={cp}
                    onChange={(e) => setCp(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder={t('facturaModal.cpPlaceholder')}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>{t('facturaModal.emailLabel')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('facturaModal.emailPlaceholder')}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              {status === 'error' && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: 'var(--color-error-bg)', color: '#F87171',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: 'var(--surface-hover)', color: 'var(--text)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}
                >
                  {t('facturaModal.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  style={{
                    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: status === 'loading' ? 'rgba(24,174,145,0.4)' : 'var(--color-primary)',
                    color: 'var(--color-primary-text)', border: 'none',
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {status === 'loading' ? t('facturaModal.stamping') : t('facturaModal.requestCfdi')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
