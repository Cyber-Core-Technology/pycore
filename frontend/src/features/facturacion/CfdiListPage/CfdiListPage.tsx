import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Download, X, AlertTriangle, FileText, Settings, ShieldCheck, ShieldAlert,
  Upload, CheckCircle, Save, Info, Eye, EyeOff,
} from 'lucide-react'
import { facturacionApi } from '@/api/facturacion-api'
import type { CFDI, MotivoCancelacion } from '@/types/facturacion.types'
import { BackToConfig } from '@/features/configuracion/components/BackToConfig'

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
  background: 'var(--surface-hover)', border: '1px solid var(--border)',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-secondary)',
  marginBottom: 4, display: 'block',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function estadoColor(estado: CFDI['estado']): string {
  switch (estado) {
    case 'timbrado':  return 'var(--color-success)'
    case 'enviado':   return '#3B82F6'
    case 'cancelado': return '#EF4444'
    case 'error':     return '#F59E0B'
    default:          return '#9CA3AF'
  }
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Producción' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '622', label: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { value: '623', label: '623 - Opcional para Grupos de Sociedades' },
  { value: '624', label: '624 - Coordinados' },
  { value: '625', label: '625 - Régimen de Actividades Empresariales con Plataformas Tecnológicas' },
  { value: '626', label: '626 - RESICO' },
  { value: '628', label: '628 - Hidrocarburos' },
  { value: '629', label: '629 - Regímenes Fiscales Preferentes y Multinacionales' },
  { value: '630', label: '630 - Enajenación de acciones en bolsa de valores' },
]

// ── Modal de cancelación ──────────────────────────────────────────────────────

const MOTIVOS: { value: MotivoCancelacion; label: string }[] = [
  { value: '01', label: '01 — Comprobante emitido con errores con relación' },
  { value: '02', label: '02 — Comprobante emitido con errores sin relación' },
  { value: '03', label: '03 — No se llevó a cabo la operación' },
  { value: '04', label: '04 — Operación nominativa relacionada en factura global' },
]

function CancelModal({ cfdi, onClose, onConfirm, loading }: {
  cfdi: CFDI; onClose: () => void
  onConfirm: (motivo: MotivoCancelacion) => void; loading: boolean
}) {
  const { t } = useTranslation()
  const [motivo, setMotivo] = useState<MotivoCancelacion>('02')
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9000 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(440px, 94vw)', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)', zIndex: 9001, padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={20} color="#F59E0B" />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('cfdiPage.cancelModal.title')}</p>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {t('cfdiPage.cancelModal.description', { uuid: cfdi.uuid_sat })}
        </p>
        <div>
          <label style={LABEL}>{t('cfdiPage.cancelModal.motivoLabel')}</label>
          <select value={motivo} onChange={e => setMotivo(e.target.value as MotivoCancelacion)} style={INPUT}>
            {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'var(--surface-hover)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            {t('cfdiPage.cancelModal.cancel')}
          </button>
          <button onClick={() => onConfirm(motivo)} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#EF4444', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? t('cfdiPage.cancelModal.loading') : t('cfdiPage.cancelModal.confirm')}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Panel de configuración ────────────────────────────────────────────────────

function ConfigPanel() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: ['facturacion-config'],
    queryFn: facturacionApi.configuracion,
  })

  const [regimen,    setRegimen]    = useState('626')
  const [cp,         setCp]         = useState('')
  const [serie,      setSerie]      = useState('A')
  const [activo,     setActivo]     = useState(false)
  const [savedBadge, setSavedBadge] = useState(false)

  useEffect(() => {
    if (!config) return
    setRegimen(config.regimen_fiscal || '626')
    setCp(config.codigo_postal_expedicion || '')
    setSerie(config.serie_cfdi || 'A')
    setActivo(config.activo)
  }, [config])

  const updateConfig = useMutation({
    mutationFn: facturacionApi.actualizarConfiguracion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturacion-config'] })
      setSavedBadge(true)
      setTimeout(() => setSavedBadge(false), 2500)
    },
  })

  const handleSaveConfig = () => {
    updateConfig.mutate({ regimen_fiscal: regimen, codigo_postal_expedicion: cp, serie_cfdi: serie, activo })
  }

  // CSD upload
  const cerRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)
  const [cerFile,   setCerFile]   = useState<File | null>(null)
  const [keyFile,   setKeyFile]   = useState<File | null>(null)
  const [csdPass,   setCsdPass]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [csdError,  setCsdError]  = useState('')
  const [csdOk,     setCsdOk]     = useState(false)

  const subirCSD = useMutation({
    mutationFn: facturacionApi.subirCSD,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturacion-config'] })
      setCsdOk(true)
      setCsdError('')
      setCerFile(null)
      setKeyFile(null)
      setCsdPass('')
      setTimeout(() => setCsdOk(false), 4000)
    },
    onError: (err: any) => {
      setCsdError(err?.response?.data?.detail ?? t('cfdiPage.config.csdUploadError'))
    },
  })

  const handleCSDUpload = async () => {
    if (!cerFile || !keyFile || !csdPass.trim()) {
      setCsdError(t('cfdiPage.config.csdValidationError'))
      return
    }
    setCsdError('')
    const [cerB64, keyB64] = await Promise.all([fileToBase64(cerFile), fileToBase64(keyFile)])
    subirCSD.mutate({ certificado_b64: cerB64, llave_b64: keyB64, password_csd: csdPass })
  }

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>{t('cfdiPage.config.loading')}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Status banner */}
      <div style={{
        padding: '14px 18px', borderRadius: 10,
        border: `1px solid ${config?.esta_lista ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
        background: config?.esta_lista ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {config?.esta_lista
          ? <ShieldCheck size={20} color="var(--color-success)" />
          : <ShieldAlert size={20} color="var(--color-warning)" />
        }
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {config?.esta_lista ? t('cfdiPage.config.statusReady') : t('cfdiPage.config.statusIncomplete')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
            {config?.esta_lista
              ? t('cfdiPage.config.statusReadyHint', { serie: `${config.serie_cfdi}${config.folio_actual}` })
              : t('cfdiPage.config.statusIncompleteHint')
            }
          </p>
        </div>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('cfdiPage.config.activeLabel')}</span>
          <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} />
        </label>
      </div>

      {/* CSD */}
      <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('cfdiPage.config.csdTitle')}</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>{t('cfdiPage.config.csdHint')}</p>
        </div>
        <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {config?.csd_subido && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: t('cfdiPage.config.certNum'),      value: config.csd_numero_certificado || '—' },
                { label: t('cfdiPage.config.certUploaded'), value: config.csd_fecha_subida ? new Date(config.csd_fecha_subida).toLocaleDateString(undefined) : '—' },
                { label: t('cfdiPage.config.certExpires'),  value: config.csd_fecha_vencimiento ? new Date(config.csd_fecha_vencimiento + 'T00:00:00').toLocaleDateString(undefined) : '—' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--surface-hover)', borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0, marginTop: 3, fontFamily: 'monospace' }}>{item.value}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={LABEL}>{t('cfdiPage.config.cerLabel')} {config?.csd_subido ? t('cfdiPage.config.cerUpdate') : '*'}</label>
                <button
                  type="button"
                  onClick={() => cerRef.current?.click()}
                  style={{
                    width: '100%', padding: '7px 12px', borderRadius: 8, fontSize: 12,
                    background: cerFile ? 'rgba(16,185,129,0.1)' : 'var(--surface-hover)',
                    border: `1px solid ${cerFile ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                    color: cerFile ? 'var(--color-success)' : 'var(--text-secondary)',
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Upload size={13} />
                  {cerFile ? cerFile.name : t('cfdiPage.config.selectCer')}
                </button>
                <input ref={cerRef} type="file" accept=".cer" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setCerFile(e.target.files[0])} />
              </div>
              <div>
                <label style={LABEL}>{t('cfdiPage.config.keyLabel')} {config?.csd_subido ? t('cfdiPage.config.cerUpdate') : '*'}</label>
                <button
                  type="button"
                  onClick={() => keyRef.current?.click()}
                  style={{
                    width: '100%', padding: '7px 12px', borderRadius: 8, fontSize: 12,
                    background: keyFile ? 'rgba(16,185,129,0.1)' : 'var(--surface-hover)',
                    border: `1px solid ${keyFile ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                    color: keyFile ? 'var(--color-success)' : 'var(--text-secondary)',
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Upload size={13} />
                  {keyFile ? keyFile.name : t('cfdiPage.config.selectKey')}
                </button>
                <input ref={keyRef} type="file" accept=".key" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setKeyFile(e.target.files[0])} />
              </div>
            </div>
            <div>
              <label style={LABEL}>{t('cfdiPage.config.passwordLabel')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={csdPass}
                  onChange={e => setCsdPass(e.target.value)}
                  placeholder={t('cfdiPage.config.passwordPlaceholder')}
                  style={{ ...INPUT, paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {csdError && (
              <p style={{ fontSize: 12, color: '#EF4444', margin: 0, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)' }}>
                {csdError}
              </p>
            )}
            {csdOk && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-success)' }}>
                <CheckCircle size={14} />
                {t('cfdiPage.config.csdOk')}
              </div>
            )}
            <button
              onClick={handleCSDUpload}
              disabled={subirCSD.isPending || (!cerFile && !keyFile)}
              style={{
                alignSelf: 'flex-start', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                border: 'none', cursor: (subirCSD.isPending || (!cerFile && !keyFile)) ? 'not-allowed' : 'pointer',
                opacity: (subirCSD.isPending || (!cerFile && !keyFile)) ? 0.6 : 1,
              }}
            >
              {subirCSD.isPending ? t('cfdiPage.config.uploading') : config?.csd_subido ? t('cfdiPage.config.replaceBtn') : t('cfdiPage.config.uploadBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Info PAC */}
      <div style={{
        padding: '12px 16px', borderRadius: 10,
        border: '1px solid var(--border)', background: 'var(--surface-hover)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <Info size={15} color="var(--color-info)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p
          style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: t('cfdiPage.config.pacInfo') }}
        />
      </div>

      {/* Datos fiscales */}
      <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('cfdiPage.config.fiscalTitle')}</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>{t('cfdiPage.config.fiscalHint')}</p>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={LABEL}>{t('cfdiPage.config.regimenLabel')}</label>
              <select value={regimen} onChange={e => setRegimen(e.target.value)} style={INPUT}>
                {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>{t('cfdiPage.config.cpLabel')}</label>
              <input
                type="text"
                maxLength={5}
                value={cp}
                onChange={e => setCp(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="01000"
                style={INPUT}
              />
            </div>
            <div>
              <label style={LABEL}>{t('cfdiPage.config.serieLabel')}</label>
              <input
                type="text"
                maxLength={10}
                value={serie}
                onChange={e => setSerie(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="A"
                style={INPUT}
              />
            </div>
          </div>

          {savedBadge && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-success)' }}>
              <CheckCircle size={14} /> {t('cfdiPage.config.savedBadge')}
            </div>
          )}
          {updateConfig.isError && (
            <p style={{ fontSize: 12, color: '#EF4444', margin: 0 }}>
              {(updateConfig.error as any)?.response?.data?.detail ?? t('cfdiPage.config.saveError')}
            </p>
          )}

          <button
            onClick={handleSaveConfig}
            disabled={updateConfig.isPending}
            style={{
              alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--color-primary)', color: 'var(--color-primary-text)',
              border: 'none', cursor: updateConfig.isPending ? 'not-allowed' : 'pointer',
              opacity: updateConfig.isPending ? 0.7 : 1,
            }}
          >
            <Save size={14} />
            {updateConfig.isPending ? t('cfdiPage.config.saving') : t('cfdiPage.config.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel de historial ────────────────────────────────────────────────────────

function HistorialPanel() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [cancelTarget, setCancelTarget] = useState<CFDI | null>(null)
  const [cancelError,  setCancelError]  = useState('')

  const { data: cfdis = [], isLoading, isError } = useQuery<CFDI[]>({
    queryKey: ['cfdis'],
    queryFn:  facturacionApi.listar,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: MotivoCancelacion }) =>
      facturacionApi.cancelar(id, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cfdis'] })
      setCancelTarget(null)
      setCancelError('')
    },
    onError: (err: any) => {
      setCancelError(err?.response?.data?.detail ?? t('cfdiPage.historial.cancelError'))
    },
  })

  if (isLoading) return <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: 40 }}>{t('cfdiPage.historial.loading')}</p>
  if (isError)   return <p style={{ color: 'var(--color-error)', fontSize: 14, textAlign: 'center', padding: 40 }}>{t('cfdiPage.historial.loadError')}</p>

  if (cfdis.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 12 }}>
        <FileText size={40} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('cfdiPage.historial.empty')}</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {t('cfdiPage.historial.emptyHint')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cfdis.map(cfdi => (
          <div
            key={cfdi.id}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px',
              display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
              alignItems: 'center', gap: 16,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: estadoColor(cfdi.estado), flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{cfdi.folio_venta}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${estadoColor(cfdi.estado)}20`, color: estadoColor(cfdi.estado) }}>
                  {cfdi.estado_display}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                {cfdi.rfc_receptor} · {cfdi.razon_social_receptor}
              </div>
              {cfdi.uuid_sat && (
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 2, opacity: 0.7 }}>
                  {cfdi.uuid_sat}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{formatFecha(cfdi.fecha_timbrado)}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace', margin: 0 }}>
                ${parseFloat(cfdi.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                IVA ${parseFloat(cfdi.impuestos).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {(cfdi.xml_s3_key || cfdi.pdf_s3_key) && cfdi.estado !== 'cancelado' && (
                <>
                  <button
                    onClick={() => window.open(facturacionApi.urlDescargarDirecto(cfdi.id, 'pdf'), '_blank')}
                    title={t('cfdiPage.historial.downloadPDF')}
                    style={{ padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--surface-hover)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                  >
                    <Download size={14} /><span style={{ fontSize: 11, marginLeft: 4 }}>PDF</span>
                  </button>
                  <button
                    onClick={() => window.open(facturacionApi.urlDescargarDirecto(cfdi.id, 'xml'), '_blank')}
                    title={t('cfdiPage.historial.downloadXML')}
                    style={{ padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--surface-hover)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                  >
                    <Download size={14} /><span style={{ fontSize: 11, marginLeft: 4 }}>XML</span>
                  </button>
                </>
              )}
              {(cfdi.estado === 'timbrado' || cfdi.estado === 'enviado') && (
                <button
                  onClick={() => { setCancelTarget(cfdi); setCancelError('') }}
                  title={t('cfdiPage.historial.cancelBtn')}
                  style={{ padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {cancelTarget && (
        <>
          <CancelModal
            cfdi={cancelTarget}
            onClose={() => { setCancelTarget(null); setCancelError('') }}
            onConfirm={(motivo) => cancelMutation.mutate({ id: cancelTarget.id, motivo })}
            loading={cancelMutation.isPending}
          />
          {cancelError && (
            <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#EF4444', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 9002 }}>
              {cancelError}
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type Tab = 'configuracion' | 'historial'

export function CfdiListPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('configuracion')

  return (
    <main style={{ padding: '20px 0 60px', maxWidth: 860, margin: '0 auto' }}>
      <BackToConfig />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('cfdiPage.title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          {t('cfdiPage.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {([
          { key: 'configuracion', label: t('cfdiPage.tabConfig'),    icon: Settings },
          { key: 'historial',     label: t('cfdiPage.tabHistorial'), icon: FileText },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--color-primary)' : 'var(--text-secondary)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.key ? 'var(--color-primary)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'configuracion' ? <ConfigPanel /> : <HistorialPanel />}
    </main>
  )
}
