import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRegistrarAsistencia } from '@/hooks/useAsistencias'
import type { ColaboradorLista, TipoAsistencia, EstadoAsistencia, AsistenciaFormData } from '@/types/rrhh.types'

interface Props {
  onClose: () => void
  onSuccess: () => void
  colaboradores: ColaboradorLista[]
}

const TIPO_VALUES: TipoAsistencia[] = ['entrada', 'salida', 'entrada_descanso', 'salida_descanso']
const ESTADO_VALUES: EstadoAsistencia[] = ['puntual', 'retardo', 'falta', 'justificado']

const todayStr = () => new Date().toISOString().slice(0, 10)

const nowLocalStr = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

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

export function AsistenciaFormModal({ onClose, onSuccess, colaboradores }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<AsistenciaFormData>({
    colaborador:    '',
    fecha:          todayStr(),
    hora_registro:  nowLocalStr(),
    tipo:           'entrada',
    estado:         'puntual',
    notas:          '',
  })
  const [error, setError] = useState<string | null>(null)

  const registrarMutation = useRegistrarAsistencia()

  const set = <K extends keyof AsistenciaFormData>(field: K, value: AsistenciaFormData[K]) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.colaborador)    { setError(t('attendanceForm.errorColaborador')); return }
    if (!form.fecha)          { setError(t('attendanceForm.errorFecha')); return }
    if (!form.hora_registro)  { setError(t('attendanceForm.errorHora')); return }

    try {
      await registrarMutation.mutateAsync(form)
      onSuccess()
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: unknown } }
      if (anyErr?.response?.data) {
        const data = anyErr.response.data
        setError(typeof data === 'string' ? data : JSON.stringify(data))
      } else {
        setError(t('attendanceForm.errorGeneral'))
      }
    }
  }

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
          maxWidth: 480,
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
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {t('attendanceForm.title')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6, display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                fontSize: 13, color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>
                {t('attendanceForm.colaborador')} <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                value={form.colaborador}
                onChange={(e) => set('colaborador', e.target.value)}
                style={inputStyle}
              >
                <option value="">{t('attendanceForm.selectColaborador')}</option>
                {colaboradores
                  .filter((c) => c.estado === 'activo')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_completo} — {c.puesto}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>
                {t('attendanceForm.tipoRegistro')} <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as TipoAsistencia)}
                style={inputStyle}
              >
                {TIPO_VALUES.map((v) => (
                  <option key={v} value={v}>{t(`attendanceForm.tipos.${v}`)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>
                  {t('attendanceForm.fecha')} <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => set('fecha', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>
                  {t('attendanceForm.horaRegistro')} <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.hora_registro}
                  onChange={(e) => set('hora_registro', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>{t('attendanceForm.estado')}</label>
              <select
                value={form.estado ?? 'puntual'}
                onChange={(e) => set('estado', e.target.value as EstadoAsistencia)}
                style={inputStyle}
              >
                {ESTADO_VALUES.map((v) => (
                  <option key={v} value={v}>{t(`attendanceForm.estados.${v}`)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>{t('attendanceForm.notes')}</label>
              <textarea
                value={form.notas ?? ''}
                onChange={(e) => set('notas', e.target.value)}
                rows={3}
                placeholder={t('attendanceForm.notesPlaceholder')}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
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
              {t('attendanceForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={registrarMutation.isPending}
              style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: registrarMutation.isPending ? 'var(--border)' : 'var(--color-primary)',
                color: 'var(--color-primary-text)', border: 'none', cursor: registrarMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {registrarMutation.isPending ? t('attendanceForm.registering') : t('attendanceForm.register')}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}
