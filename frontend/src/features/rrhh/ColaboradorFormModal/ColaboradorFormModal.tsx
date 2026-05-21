import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useCrearColaborador, useActualizarColaborador } from '@/hooks/useColaboradores'
import { usuariosApi } from '@/api/usuarios-api'
import type { Colaborador, ColaboradorFormData, TipoContrato, EstadoColaborador } from '@/types/rrhh.types'

interface Props {
  colaborador?: Colaborador | null
  onClose: () => void
  onSuccess: () => void
}

const TIPO_CONTRATO_VALUES: TipoContrato[] = ['planta', 'temporal', 'honorarios', 'practicante']

const ESTADO_VALUES: EstadoColaborador[] = ['activo', 'baja', 'vacaciones', 'incapacidad']

type Tab = 'personal' | 'contacto' | 'laboral' | 'acceso'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: 'var(--surface-hover)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 4,
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export function ColaboradorFormModal({ colaborador, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const isEdit = !!colaborador
  const [tab, setTab] = useState<Tab>('personal')
  const [error, setError] = useState<string | null>(null)

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-empresa'],
    queryFn: () => usuariosApi.listar(),
    enabled: isEdit,
  })

  const [form, setForm] = useState<ColaboradorFormData>({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    curp: '',
    rfc: '',
    nss: '',
    email: '',
    telefono: '',
    puesto: '',
    departamento: '',
    fecha_ingreso: new Date().toISOString().slice(0, 10),
    tipo_contrato: 'planta',
    salario_diario: undefined,
    estado: 'activo',
    usuario: undefined,
  })

  useEffect(() => {
    if (colaborador) {
      setForm({
        nombre: colaborador.nombre,
        apellido_paterno: colaborador.apellido_paterno,
        apellido_materno: colaborador.apellido_materno ?? '',
        fecha_nacimiento: colaborador.fecha_nacimiento ?? '',
        curp: colaborador.curp ?? '',
        rfc: colaborador.rfc ?? '',
        nss: colaborador.nss ?? '',
        email: colaborador.email ?? '',
        telefono: colaborador.telefono ?? '',
        puesto: colaborador.puesto,
        departamento: colaborador.departamento ?? '',
        fecha_ingreso: colaborador.fecha_ingreso,
        tipo_contrato: colaborador.tipo_contrato ?? 'planta',
        salario_diario: colaborador.salario_diario ? parseFloat(colaborador.salario_diario) : undefined,
        estado: colaborador.estado ?? 'activo',
        usuario: colaborador.usuario_id ?? null,
      })
    }
  }, [colaborador])

  const crearMutation   = useCrearColaborador()
  const actualizarMutation = useActualizarColaborador()

  const isPending = crearMutation.isPending || actualizarMutation.isPending

  const set = (field: keyof ColaboradorFormData, value: string | number | undefined) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) { setError(t('colaboradorForm.errorNombre')); setTab('personal'); return }
    if (!form.apellido_paterno.trim()) { setError(t('colaboradorForm.errorApellido')); setTab('personal'); return }
    if (!form.puesto.trim()) { setError(t('colaboradorForm.errorPuesto')); setTab('laboral'); return }
    if (!form.fecha_ingreso) { setError(t('colaboradorForm.errorFecha')); setTab('laboral'); return }

    // Strip empty strings so Django doesn't try to parse "" as a date/email
    const cleanedForm = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '')
    ) as ColaboradorFormData

    // When saving from the "Acceso" tab, only send the usuario field
    const dataToSend = tab === 'acceso' ? { usuario: form.usuario ?? null } : cleanedForm

    try {
      if (isEdit && colaborador) {
        await actualizarMutation.mutateAsync({ id: colaborador.id, data: dataToSend })
      } else {
        await crearMutation.mutateAsync(cleanedForm)
      }
      onSuccess()
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: unknown } }
      if (anyErr?.response?.data) {
        const data = anyErr.response.data
        setError(typeof data === 'string' ? data : JSON.stringify(data))
      } else {
        setError(t('colaboradorForm.errorGeneric'))
      }
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'personal', label: t('colaboradorForm.tabPersonal') },
    { key: 'contacto', label: t('colaboradorForm.tabContacto') },
    { key: 'laboral',  label: t('colaboradorForm.tabLaboral') },
    ...(isEdit ? [{ key: 'acceso' as Tab, label: t('colaboradorForm.tabAcceso') }] : []),
  ]

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              {isEdit ? t('colaboradorForm.titleEdit') : t('colaboradorForm.titleNew')}
            </h2>
            {isEdit && colaborador && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                {colaborador.nombre_completo}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6, display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          padding: '0 24px',
        }}>
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: tab === tabItem.key ? 600 : 400,
                color: tab === tabItem.key ? 'var(--color-primary)' : 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                borderBottom: tab === tabItem.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

            {/* Error banner */}
            {error && (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                fontSize: 13, color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            {/* Datos personales */}
            {tab === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label={t('colaboradorForm.nombre')} required>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => set('nombre', e.target.value)}
                      style={inputStyle}
                      placeholder={t('colaboradorForm.nombrePlaceholder')}
                    />
                  </Field>
                  <Field label={t('colaboradorForm.apellidoPaterno')} required>
                    <input
                      type="text"
                      value={form.apellido_paterno}
                      onChange={(e) => set('apellido_paterno', e.target.value)}
                      style={inputStyle}
                      placeholder={t('colaboradorForm.apellidoPaterno')}
                    />
                  </Field>
                </div>

                <Field label={t('colaboradorForm.apellidoMaternoLabel')}>
                  <input
                    type="text"
                    value={form.apellido_materno ?? ''}
                    onChange={(e) => set('apellido_materno', e.target.value)}
                    style={inputStyle}
                    placeholder={t('colaboradorForm.apellidoMaternoLabel')}
                  />
                </Field>

                <Field label={t('colaboradorForm.fechaNacimiento')}>
                  <input
                    type="date"
                    value={form.fecha_nacimiento ?? ''}
                    onChange={(e) => set('fecha_nacimiento', e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label={t('colaboradorForm.curp')}>
                    <input
                      type="text"
                      value={form.curp ?? ''}
                      onChange={(e) => set('curp', e.target.value.toUpperCase())}
                      style={inputStyle}
                      placeholder={t('colaboradorForm.curp')}
                      maxLength={18}
                    />
                  </Field>
                  <Field label={t('colaboradorForm.rfc')}>
                    <input
                      type="text"
                      value={form.rfc ?? ''}
                      onChange={(e) => set('rfc', e.target.value.toUpperCase())}
                      style={inputStyle}
                      placeholder={t('colaboradorForm.rfc')}
                      maxLength={13}
                    />
                  </Field>
                </div>

                <Field label={t('colaboradorForm.nss')}>
                  <input
                    type="text"
                    value={form.nss ?? ''}
                    onChange={(e) => set('nss', e.target.value)}
                    style={inputStyle}
                    placeholder={t('colaboradorForm.nss')}
                    maxLength={11}
                  />
                </Field>
              </div>
            )}

            {/* Contacto */}
            {tab === 'contacto' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={t('colaboradorForm.email')}>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => set('email', e.target.value)}
                    style={inputStyle}
                    placeholder={t('colaboradorForm.emailPlaceholder')}
                  />
                </Field>
                <Field label={t('colaboradorForm.telefono')}>
                  <input
                    type="tel"
                    value={form.telefono ?? ''}
                    onChange={(e) => set('telefono', e.target.value)}
                    style={inputStyle}
                    placeholder={t('colaboradorForm.telefonoPlaceholder')}
                    maxLength={15}
                  />
                </Field>
              </div>
            )}

            {/* Laboral */}
            {tab === 'laboral' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={t('colaboradorForm.puesto')} required>
                  <input
                    type="text"
                    value={form.puesto}
                    onChange={(e) => set('puesto', e.target.value)}
                    style={inputStyle}
                    placeholder={t('colaboradorForm.puestoPlaceholder')}
                  />
                </Field>

                <Field label={t('colaboradorForm.departamento')}>
                  <input
                    type="text"
                    value={form.departamento ?? ''}
                    onChange={(e) => set('departamento', e.target.value)}
                    style={inputStyle}
                    placeholder={t('colaboradorForm.departamentoPlaceholder')}
                  />
                </Field>

                <Field label={t('colaboradorForm.fechaIngreso')} required>
                  <input
                    type="date"
                    value={form.fecha_ingreso}
                    onChange={(e) => set('fecha_ingreso', e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label={t('colaboradorForm.tipoContratoLabel')}>
                  <select
                    value={form.tipo_contrato ?? 'planta'}
                    onChange={(e) => set('tipo_contrato', e.target.value)}
                    style={inputStyle}
                  >
                    {TIPO_CONTRATO_VALUES.map((v) => (
                      <option key={v} value={v}>{t(`colaboradorForm.tipoContratoOptions.${v}`)}</option>
                    ))}
                  </select>
                </Field>

                <Field label={t('colaboradorForm.salarioDiario')}>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.salario_diario ?? ''}
                    onChange={(e) => set('salario_diario', e.target.value ? parseFloat(e.target.value) : undefined)}
                    style={inputStyle}
                    placeholder="0.00"
                  />
                </Field>

                {isEdit && (
                  <Field label={t('colaboradorForm.estadoLabel')}>
                    <select
                      value={form.estado ?? 'activo'}
                      onChange={(e) => set('estado', e.target.value)}
                      style={inputStyle}
                    >
                      {ESTADO_VALUES.map((v) => (
                        <option key={v} value={v}>{t(`colaboradorForm.estadoOptions.${v}`)}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            )}
            {/* Acceso al sistema */}
            {tab === 'acceso' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t('colaboradorForm.accesoHint')}
                </p>

                <Field label={t('colaboradorForm.usuarioLabel')}>
                  <select
                    value={form.usuario ?? ''}
                    onChange={(e) => set('usuario', e.target.value || undefined)}
                    style={inputStyle}
                  >
                    <option value="">{t('colaboradorForm.sinAcceso')}</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        @{u.username} · {u.nombre_completo} ({u.email})
                      </option>
                    ))}
                  </select>
                </Field>

                {form.usuario && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                    fontSize: 13, color: 'var(--color-success)',
                  }}>
                    {t('colaboradorForm.accesoLinked')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                background: 'var(--surface-hover)', border: '1px solid var(--border)',
                color: 'var(--text)', cursor: 'pointer',
              }}
            >
              {t('colaboradorForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: isPending ? 'var(--border)' : 'var(--color-primary)',
                color: 'var(--color-primary-text)', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? t('colaboradorForm.saving') : isEdit ? t('colaboradorForm.save') : t('colaboradorForm.create')}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}
