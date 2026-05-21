import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCrearCliente, useActualizarCliente } from '@/hooks/useClientes'
import type { Cliente, ClienteFormData, TipoPersona, TipoCliente } from '@/types/terceros.types'

interface Props {
  cliente?: Cliente | null
  onClose:   () => void
  onSuccess: () => void
}

type Tab = 'general' | 'direccion' | 'credito'

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

const EMPTY: ClienteFormData = { tipo_persona: 'fisica', nombre_comercial: '', tipo_cliente: '' }

export function ClienteFormModal({ cliente, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const isEdit = !!cliente
  const crear     = useCrearCliente()
  const actualizar = useActualizarCliente()

  const [tab,   setTab]   = useState<Tab>('general')
  const [form,  setForm]  = useState<ClienteFormData>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cliente) {
      setForm({
        codigo:                   cliente.codigo,
        tipo_persona:             cliente.tipo_persona,
        nombre_comercial:         cliente.nombre_comercial,
        razon_social:             cliente.razon_social,
        rfc:                      cliente.rfc,
        regimen_fiscal:           cliente.regimen_fiscal,
        email:                    cliente.email,
        telefono:                 cliente.telefono,
        celular:                  cliente.celular,
        sitio_web:                cliente.sitio_web,
        calle:                    cliente.calle,
        numero_exterior:          cliente.numero_exterior,
        numero_interior:          cliente.numero_interior,
        colonia:                  cliente.colonia,
        codigo_postal:            cliente.codigo_postal,
        ciudad:                   cliente.ciudad,
        estado:                   cliente.estado,
        pais:                     cliente.pais,
        limite_credito:           Number(cliente.limite_credito),
        dias_credito:             cliente.dias_credito,
        tipo_cliente:             cliente.tipo_cliente,
        descuento_predeterminado: Number(cliente.descuento_predeterminado),
        notas:                    cliente.notas,
      })
    } else {
      setForm(EMPTY)
    }
  }, [cliente])

  const set = (key: keyof ClienteFormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    if (!form.nombre_comercial.trim()) {
      setError(t('clienteForm.errorNombreComercial'))
      return
    }
    setError(null)
    try {
      if (isEdit && cliente) {
        await actualizar.mutateAsync({ id: cliente.id, data: form })
      } else {
        await crear.mutateAsync(form)
      }
      onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } }
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data as Record<string, string[]>).flat()
        setError(msgs.join(' ') || t('clienteForm.errorSave'))
      } else {
        setError(t('clienteForm.errorSave'))
      }
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general',   label: t('clienteForm.tabGeneral')   },
    { key: 'direccion', label: t('clienteForm.tabDireccion') },
    { key: 'credito',   label: t('clienteForm.tabCredito')   },
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
              {isEdit ? t('clienteForm.titleEdit') : t('clienteForm.titleNew')}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {isEdit ? cliente!.nombre_comercial : t('clienteForm.subtitleNew')}
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
                <Field label={t('clienteForm.labelTipoPersona')}>
                  <select value={form.tipo_persona} onChange={(e) => set('tipo_persona', e.target.value as TipoPersona)} style={INPUT}>
                    <option value="fisica">{t('clienteForm.tipoPersona.fisica')}</option>
                    <option value="moral">{t('clienteForm.tipoPersona.moral')}</option>
                  </select>
                </Field>
                <Field label={t('clienteForm.labelCodigo')}>
                  <input type="text" value={form.codigo ?? ''} onChange={(e) => set('codigo', e.target.value)} placeholder="CLI-001" style={INPUT} />
                </Field>
              </div>

              <Field label={t('clienteForm.labelNombreComercial')}>
                <input
                  type="text"
                  value={form.nombre_comercial}
                  onChange={(e) => set('nombre_comercial', e.target.value)}
                  placeholder={t('clienteForm.nombrePlaceholder')}
                  style={{ ...INPUT, borderColor: error && !form.nombre_comercial.trim() ? 'var(--color-error)' : 'var(--border)' }}
                />
              </Field>

              <Field label={t('clienteForm.labelRazonSocial')}>
                <input type="text" value={form.razon_social ?? ''} onChange={(e) => set('razon_social', e.target.value)} placeholder={t('clienteForm.razonPlaceholder')} style={INPUT} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('clienteForm.labelRfc')}>
                  <input type="text" value={form.rfc ?? ''} onChange={(e) => set('rfc', e.target.value.toUpperCase())} placeholder="XAXX010101000" maxLength={13} style={INPUT} />
                </Field>
                <Field label={t('clienteForm.labelTipoCliente')}>
                  <select value={form.tipo_cliente ?? ''} onChange={(e) => set('tipo_cliente', e.target.value as TipoCliente | '')} style={INPUT}>
                    <option value="">{t('clienteForm.tipoCliente.sinClasificar')}</option>
                    <option value="minorista">{t('clienteForm.tipoCliente.minorista')}</option>
                    <option value="mayorista">{t('clienteForm.tipoCliente.mayorista')}</option>
                    <option value="distribuidor">{t('clienteForm.tipoCliente.distribuidor')}</option>
                  </select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('clienteForm.labelEmail')}>
                  <input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="correo@empresa.com" style={INPUT} />
                </Field>
                <Field label={t('clienteForm.labelTelefono')}>
                  <input type="text" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} placeholder="33 1234 5678" style={INPUT} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('clienteForm.labelCelular')}>
                  <input type="text" value={form.celular ?? ''} onChange={(e) => set('celular', e.target.value)} placeholder="33 9876 5432" style={INPUT} />
                </Field>
                <Field label={t('clienteForm.labelDescuento')}>
                  <input type="number" min={0} max={100} step={0.5} value={form.descuento_predeterminado ?? 0} onChange={(e) => set('descuento_predeterminado', Number(e.target.value))} style={INPUT} />
                </Field>
              </div>

              <Field label={t('clienteForm.labelNotas')}>
                <textarea
                  value={form.notas ?? ''}
                  onChange={(e) => set('notas', e.target.value)}
                  rows={3}
                  placeholder={t('clienteForm.notasPlaceholder')}
                  style={{ ...INPUT, resize: 'none' }}
                />
              </Field>
            </>
          )}

          {tab === 'direccion' && (
            <>
              <Field label={t('clienteForm.labelCalle')}>
                <input type="text" value={form.calle ?? ''} onChange={(e) => set('calle', e.target.value)} placeholder="Av. Revolución" style={INPUT} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <Field label={t('clienteForm.labelNumExt')}>
                  <input type="text" value={form.numero_exterior ?? ''} onChange={(e) => set('numero_exterior', e.target.value)} placeholder="123" style={INPUT} />
                </Field>
                <Field label={t('clienteForm.labelNumInt')}>
                  <input type="text" value={form.numero_interior ?? ''} onChange={(e) => set('numero_interior', e.target.value)} placeholder="A" style={INPUT} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <Field label={t('clienteForm.labelColonia')}>
                  <input type="text" value={form.colonia ?? ''} onChange={(e) => set('colonia', e.target.value)} placeholder="Centro" style={INPUT} />
                </Field>
                <Field label={t('clienteForm.labelCp')}>
                  <input type="text" value={form.codigo_postal ?? ''} onChange={(e) => set('codigo_postal', e.target.value)} placeholder="44100" maxLength={10} style={INPUT} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <Field label={t('clienteForm.labelCiudad')}>
                  <input type="text" value={form.ciudad ?? ''} onChange={(e) => set('ciudad', e.target.value)} placeholder="Guadalajara" style={INPUT} />
                </Field>
                <Field label={t('clienteForm.labelEstado')}>
                  <input type="text" value={form.estado ?? ''} onChange={(e) => set('estado', e.target.value)} placeholder="Jalisco" style={INPUT} />
                </Field>
              </div>

              <Field label={t('clienteForm.labelPais')}>
                <input type="text" value={form.pais ?? 'México'} onChange={(e) => set('pais', e.target.value)} style={INPUT} />
              </Field>
            </>
          )}

          {tab === 'credito' && (
            <>
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: 'rgba(24,174,145,0.08)', color: 'var(--text-secondary)',
                border: '1px solid rgba(24,174,145,0.2)',
              }}>
                {t('clienteForm.creditoHint')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('clienteForm.labelLimiteCredito')}>
                  <input type="number" min={0} step={100} value={form.limite_credito ?? 0} onChange={(e) => set('limite_credito', Number(e.target.value))} style={INPUT} />
                </Field>
                <Field label={t('clienteForm.labelDiasCredito')}>
                  <input type="number" min={0} step={1} value={form.dias_credito ?? 0} onChange={(e) => set('dias_credito', Number(e.target.value))} style={INPUT} />
                </Field>
              </div>

              {isEdit && cliente && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{t('clienteForm.limiteActual')}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      ${Number(cliente.limite_credito).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{t('clienteForm.disponible')}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>
                      ${Number(cliente.credito_disponible).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              {t('clienteForm.cancel')}
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
              {isPending ? t('clienteForm.saving') : isEdit ? t('clienteForm.save') : t('clienteForm.create')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
