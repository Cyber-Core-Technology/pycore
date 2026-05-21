import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRegistrarGasto } from '@/hooks/useGastos'
import type { GastoFormData, CategoriaGasto, MetodoPago } from '@/types/finanzas.types'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIA_VALUES: CategoriaGasto[] = [
  'renta', 'servicios', 'nomina', 'mantenimiento', 'marketing', 'transporte', 'impuestos', 'otro',
]

const METODO_VALUES: MetodoPago[] = [
  'efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'cheque', 'otro',
]

const today = () => new Date().toISOString().slice(0, 10)

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  background: 'var(--surface-hover)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 4,
  display: 'block',
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export function GastoFormModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm]   = useState<GastoFormData>({
    concepto:       '',
    categoria:      'otro',
    monto:          0,
    impuesto_monto: 0,
    metodo_pago:    'efectivo',
    fecha_gasto:    today(),
    referencia:     '',
    notas:          '',
  })

  const registrar  = useRegistrarGasto()
  const isPending  = registrar.isPending

  const set = <K extends keyof GastoFormData>(key: K, value: GastoFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const monto          = Number(form.monto) || 0
  const impuesto_monto = Number(form.impuesto_monto) || 0
  const total          = monto + impuesto_monto

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.concepto.trim()) {
      setError(t('gastoForm.errorConcepto'))
      return
    }
    if (monto <= 0) {
      setError(t('gastoForm.errorMonto'))
      return
    }

    try {
      await registrar.mutateAsync(form)
      onSuccess()
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: Record<string, string[]> } }
      const detail = anyErr?.response?.data
      if (detail) {
        const msgs = Object.values(detail).flat()
        setError(msgs.join(' ') || t('gastoForm.errorGeneral'))
      } else {
        setError(t('gastoForm.errorGeneral'))
      }
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          position: 'fixed',
          zIndex: 9999,
          width: 'min(560px, 95vw)',
          maxHeight: '90vh',
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('gastoForm.title')}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('gastoForm.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: 8, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <FieldGroup label={t('gastoForm.concepto')}>
            <input
              type="text"
              value={form.concepto}
              onChange={(e) => set('concepto', e.target.value)}
              placeholder={t('gastoForm.conceptoPlaceholder')}
              style={inputStyle}
              required
            />
          </FieldGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldGroup label={t('gastoForm.categoria')}>
              <select
                value={form.categoria ?? 'otro'}
                onChange={(e) => set('categoria', e.target.value as CategoriaGasto)}
                style={inputStyle}
              >
                {CATEGORIA_VALUES.map((v) => (
                  <option key={v} value={v}>{t(`gastoForm.categorias.${v}`)}</option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label={t('gastoForm.metodoPago')}>
              <select
                value={form.metodo_pago}
                onChange={(e) => set('metodo_pago', e.target.value as MetodoPago)}
                style={inputStyle}
              >
                {METODO_VALUES.map((v) => (
                  <option key={v} value={v}>{t(`gastoForm.metodos.${v}`)}</option>
                ))}
              </select>
            </FieldGroup>
          </div>

          <FieldGroup label={t('gastoForm.fecha')}>
            <input
              type="date"
              value={form.fecha_gasto ?? today()}
              onChange={(e) => set('fecha_gasto', e.target.value)}
              style={inputStyle}
            />
          </FieldGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldGroup label={t('gastoForm.monto')}>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={form.monto}
                onChange={(e) => set('monto', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={inputStyle}
                required
              />
            </FieldGroup>

            <FieldGroup label={t('gastoForm.impuesto')}>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.impuesto_monto ?? 0}
                onChange={(e) => set('impuesto_monto', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={inputStyle}
              />
            </FieldGroup>
          </div>

          {/* Total computed */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 10,
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('gastoForm.totalLabel')}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {total.toLocaleString(undefined, { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })}
            </span>
          </div>

          <FieldGroup label={t('gastoForm.referencia')}>
            <input
              type="text"
              value={form.referencia ?? ''}
              onChange={(e) => set('referencia', e.target.value)}
              placeholder={t('gastoForm.referenciaPh')}
              style={inputStyle}
            />
          </FieldGroup>

          <FieldGroup label={t('gastoForm.notas')}>
            <textarea
              value={form.notas ?? ''}
              onChange={(e) => set('notas', e.target.value)}
              placeholder={t('gastoForm.notasPh')}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FieldGroup>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
            >
              {t('gastoForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: isPending ? 'var(--border)' : 'var(--color-primary)',
                color: 'var(--color-primary-text)', fontSize: 13, fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? t('gastoForm.registering') : t('gastoForm.register')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
