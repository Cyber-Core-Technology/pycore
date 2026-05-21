import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCrearProveedor, useActualizarProveedor } from '@/hooks/useProveedores'
import type { Proveedor, ProveedorFormData, TipoPersonaP, TipoProveedor } from '@/types/proveedores.types'

interface Props {
  proveedor?: Proveedor | null
  onClose:    () => void
  onSuccess:  () => void
}

type Tab = 'general' | 'direccion' | 'terminos'

const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none',
  background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)',
  boxSizing: 'border-box',
}

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-secondary)',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  )
}

const EMPTY: ProveedorFormData = { tipo_persona: 'fisica', nombre_comercial: '' }

export function ProveedorFormModal({ proveedor, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const isEdit     = !!proveedor
  const crear      = useCrearProveedor()
  const actualizar = useActualizarProveedor()

  const [tab,   setTab]   = useState<Tab>('general')
  const [form,  setForm]  = useState<ProveedorFormData>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (proveedor) {
      setForm({
        codigo:                proveedor.codigo,
        tipo_persona:          proveedor.tipo_persona,
        nombre_comercial:      proveedor.nombre_comercial,
        razon_social:          proveedor.razon_social,
        rfc:                   proveedor.rfc,
        email:                 proveedor.email,
        telefono:              proveedor.telefono,
        celular:               proveedor.celular,
        sitio_web:             proveedor.sitio_web,
        contacto_principal:    proveedor.contacto_principal,
        calle:                 proveedor.calle,
        numero_exterior:       proveedor.numero_exterior,
        numero_interior:       proveedor.numero_interior,
        colonia:               proveedor.colonia,
        codigo_postal:         proveedor.codigo_postal,
        ciudad:                proveedor.ciudad,
        estado:                proveedor.estado,
        pais:                  proveedor.pais,
        dias_credito:          proveedor.dias_credito,
        descuento_pronto_pago: Number(proveedor.descuento_pronto_pago),
        dias_pronto_pago:      proveedor.dias_pronto_pago,
        tipo_proveedor:        proveedor.tipo_proveedor,
        notas:                 proveedor.notas,
      })
    } else {
      setForm(EMPTY)
    }
  }, [proveedor])

  const set = (key: keyof ProveedorFormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    if (!form.nombre_comercial.trim()) {
      setError(t('proveedorForm.errorNombreComercial'))
      return
    }
    setError(null)
    try {
      if (isEdit && proveedor) {
        await actualizar.mutateAsync({ id: proveedor.id, data: form })
      } else {
        await crear.mutateAsync(form)
      }
      onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } }
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data as Record<string, string[]>).flat()
        setError(msgs.join(' ') || t('proveedorForm.errorSave'))
      } else {
        setError(t('proveedorForm.errorSave'))
      }
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general',   label: t('proveedorForm.tabGeneral')   },
    { key: 'direccion', label: t('proveedorForm.tabDireccion') },
    { key: 'terminos',  label: t('proveedorForm.tabTerminos')  },
  ]

  const isPending = crear.isPending || actualizar.isPending

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(580px, 95vw)',
        height: 'min(90vh, 660px)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalEnter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>

        {/* ── Header ──────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              {isEdit ? t('proveedorForm.titleEdit') : t('proveedorForm.titleNew')}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {isEdit ? proveedor!.nombre_comercial : t('proveedorForm.subtitleNew')}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 6, borderRadius: 8, color: 'var(--text-secondary)',
              background: 'var(--surface-hover)', border: 'none', cursor: 'pointer', display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div style={{
          display: 'flex', flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          padding: '0 20px',
        }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer', background: 'none',
                borderBottom: tab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: tab === t.key ? 'var(--color-primary)' : 'var(--text-secondary)',
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0,
        }}>

          {tab === 'general' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <Field label={t('proveedorForm.labelTipoPersona')}>
                  <select value={form.tipo_persona} onChange={(e) => set('tipo_persona', e.target.value as TipoPersonaP)} style={INPUT}>
                    <option value="fisica">{t('proveedorForm.tipoPersona.fisica')}</option>
                    <option value="moral">{t('proveedorForm.tipoPersona.moral')}</option>
                  </select>
                </Field>
                <Field label={t('proveedorForm.labelCodigo')}>
                  <input type="text" value={form.codigo ?? ''} onChange={(e) => set('codigo', e.target.value)} placeholder="PRV-001" style={INPUT} />
                </Field>
              </div>

              <Field label={t('proveedorForm.labelNombreComercial')}>
                <input
                  type="text"
                  value={form.nombre_comercial}
                  onChange={(e) => set('nombre_comercial', e.target.value)}
                  placeholder={t('proveedorForm.nombrePlaceholder')}
                  style={{ ...INPUT, borderColor: error && !form.nombre_comercial.trim() ? 'var(--color-error)' : 'var(--border)' }}
                />
              </Field>

              <Field label={t('proveedorForm.labelRazonSocial')}>
                <input type="text" value={form.razon_social ?? ''} onChange={(e) => set('razon_social', e.target.value)} placeholder={t('proveedorForm.razonPlaceholder')} style={INPUT} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('proveedorForm.labelRfc')}>
                  <input type="text" value={form.rfc ?? ''} onChange={(e) => set('rfc', e.target.value.toUpperCase())} placeholder="XAXX010101000" maxLength={13} style={INPUT} />
                </Field>
                <Field label={t('proveedorForm.labelTipoProveedor')}>
                  <select value={form.tipo_proveedor ?? ''} onChange={(e) => set('tipo_proveedor', e.target.value as TipoProveedor | '')} style={INPUT}>
                    <option value="">{t('proveedorForm.tipoProveedor.sinClasificar')}</option>
                    <option value="materia_prima">{t('proveedorForm.tipoProveedor.materia_prima')}</option>
                    <option value="servicios">{t('proveedorForm.tipoProveedor.servicios')}</option>
                    <option value="equipos">{t('proveedorForm.tipoProveedor.equipos')}</option>
                    <option value="consumibles">{t('proveedorForm.tipoProveedor.consumibles')}</option>
                    <option value="otro">{t('proveedorForm.tipoProveedor.otro')}</option>
                  </select>
                </Field>
              </div>

              <Field label={t('proveedorForm.labelContactoPrincipal')}>
                <input type="text" value={form.contacto_principal ?? ''} onChange={(e) => set('contacto_principal', e.target.value)} placeholder={t('proveedorForm.contactoPlaceholder')} style={INPUT} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('proveedorForm.labelEmail')}>
                  <input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="correo@empresa.com" style={INPUT} />
                </Field>
                <Field label={t('proveedorForm.labelTelefono')}>
                  <input type="text" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} placeholder="33 1234 5678" style={INPUT} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('proveedorForm.labelCelular')}>
                  <input type="text" value={form.celular ?? ''} onChange={(e) => set('celular', e.target.value)} placeholder="33 9876 5432" style={INPUT} />
                </Field>
                <Field label={t('proveedorForm.labelSitioWeb')}>
                  <input type="text" value={form.sitio_web ?? ''} onChange={(e) => set('sitio_web', e.target.value)} placeholder="https://proveedor.com" style={INPUT} />
                </Field>
              </div>

              <Field label={t('proveedorForm.labelNotas')}>
                <textarea
                  value={form.notas ?? ''}
                  onChange={(e) => set('notas', e.target.value)}
                  rows={3}
                  placeholder={t('proveedorForm.notasPlaceholder')}
                  style={{ ...INPUT, resize: 'none' }}
                />
              </Field>
            </>
          )}

          {tab === 'direccion' && (
            <>
              <Field label={t('proveedorForm.labelCalle')}>
                <input type="text" value={form.calle ?? ''} onChange={(e) => set('calle', e.target.value)} placeholder="Av. Revolución" style={INPUT} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <Field label={t('proveedorForm.labelNumExt')}>
                  <input type="text" value={form.numero_exterior ?? ''} onChange={(e) => set('numero_exterior', e.target.value)} placeholder="123" style={INPUT} />
                </Field>
                <Field label={t('proveedorForm.labelNumInt')}>
                  <input type="text" value={form.numero_interior ?? ''} onChange={(e) => set('numero_interior', e.target.value)} placeholder="A" style={INPUT} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <Field label={t('proveedorForm.labelColonia')}>
                  <input type="text" value={form.colonia ?? ''} onChange={(e) => set('colonia', e.target.value)} placeholder="Centro" style={INPUT} />
                </Field>
                <Field label={t('proveedorForm.labelCp')}>
                  <input type="text" value={form.codigo_postal ?? ''} onChange={(e) => set('codigo_postal', e.target.value)} placeholder="44100" maxLength={10} style={INPUT} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <Field label={t('proveedorForm.labelCiudad')}>
                  <input type="text" value={form.ciudad ?? ''} onChange={(e) => set('ciudad', e.target.value)} placeholder="Guadalajara" style={INPUT} />
                </Field>
                <Field label={t('proveedorForm.labelEstado')}>
                  <input type="text" value={form.estado ?? ''} onChange={(e) => set('estado', e.target.value)} placeholder="Jalisco" style={INPUT} />
                </Field>
              </div>

              <Field label={t('proveedorForm.labelPais')}>
                <input type="text" value={form.pais ?? 'México'} onChange={(e) => set('pais', e.target.value)} style={INPUT} />
              </Field>
            </>
          )}

          {tab === 'terminos' && (
            <>
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: 'rgba(24,174,145,0.08)', color: 'var(--text-secondary)',
                border: '1px solid rgba(24,174,145,0.2)',
              }}>
                {t('proveedorForm.terminosHint')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('proveedorForm.labelDiasCredito')}>
                  <input type="number" min={0} step={1} value={form.dias_credito ?? 0} onChange={(e) => set('dias_credito', Number(e.target.value))} style={INPUT} />
                </Field>
                <Field label={t('proveedorForm.labelDiasPP')}>
                  <input type="number" min={0} step={1} value={form.dias_pronto_pago ?? 0} onChange={(e) => set('dias_pronto_pago', Number(e.target.value))} style={INPUT} />
                </Field>
              </div>

              <Field label={t('proveedorForm.labelDescuento')}>
                <input type="number" min={0} max={100} step={0.5} value={form.descuento_pronto_pago ?? 0} onChange={(e) => set('descuento_pronto_pago', Number(e.target.value))} style={INPUT} />
              </Field>

              {isEdit && proveedor && (proveedor.dias_credito > 0 || proveedor.dias_pronto_pago > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{t('proveedorForm.creditoActual')}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {proveedor.dias_credito} {t('proveedorForm.dias')}
                    </p>
                  </div>
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{t('proveedorForm.descuentoPP')}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                      {Number(proveedor.descuento_pronto_pago)}%
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          {error ? (
            <p style={{ fontSize: 12, color: '#F87171', margin: 0 }}>{error}</p>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: 'var(--surface-hover)', color: 'var(--text)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              {t('proveedorForm.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: isPending ? 'rgba(24,174,145,0.4)' : 'var(--color-primary)',
                color: 'var(--color-primary-text)', border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? t('proveedorForm.saving') : isEdit ? t('proveedorForm.save') : t('proveedorForm.create')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
