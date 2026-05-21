import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useCrearCuentaBancaria, useActualizarCuentaBancaria } from '@/hooks/useTesoreria'
import type { CuentaBancaria, CuentaBancariaFormData, TipoCuenta, Moneda } from '@/types/finanzas.types'

interface Props {
  cuenta?: CuentaBancaria | null
  onClose: () => void
  onSuccess: () => void
}

type Tab = 'general' | 'configuracion'

const TIPO_VALUES: TipoCuenta[] = ['cheques', 'ahorro', 'inversion', 'caja']
const MONEDA_VALUES: Moneda[]   = ['MXN', 'USD', 'EUR']

const MONEDA_LABELS: Record<string, string> = {
  MXN: 'MXN — Peso Mexicano',
  USD: 'USD — Dólar Americano',
  EUR: 'EUR — Euro',
}

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

export function CuentaBancariaFormModal({ cuenta, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const isEdit = !!cuenta
  const [tab, setTab] = useState<Tab>('general')
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CuentaBancariaFormData>({
    nombre: '',
    banco: '',
    numero_cuenta: '',
    clabe: '',
    tipo_cuenta: 'cheques',
    moneda: 'MXN',
    saldo_inicial: 0,
    es_principal: false,
    notas: '',
  })

  useEffect(() => {
    if (cuenta) {
      setForm({
        nombre:        cuenta.nombre,
        banco:         cuenta.banco,
        numero_cuenta: cuenta.numero_cuenta,
        clabe:         cuenta.clabe,
        tipo_cuenta:   cuenta.tipo_cuenta,
        moneda:        cuenta.moneda,
        es_principal:  cuenta.es_principal,
        notas:         cuenta.notas,
      })
    }
  }, [cuenta])

  const crear      = useCrearCuentaBancaria()
  const actualizar = useActualizarCuentaBancaria()
  const isPending  = crear.isPending || actualizar.isPending

  const set = <K extends keyof CuentaBancariaFormData>(key: K, value: CuentaBancariaFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) {
      setError(t('cuentaBancariaForm.errorNombre'))
      return
    }

    try {
      if (isEdit) {
        const { saldo_inicial: _s, ...editData } = form
        await actualizar.mutateAsync({ id: cuenta!.id_cuenta, data: editData })
      } else {
        await crear.mutateAsync(form)
      }
      onSuccess()
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: Record<string, string[]> } }
      const detail = anyErr?.response?.data
      if (detail) {
        const msgs = Object.values(detail).flat()
        setError(msgs.join(' ') || t('cuentaBancariaForm.errorSave'))
      } else {
        setError(t('cuentaBancariaForm.errorSave'))
      }
    }
  }

  const tabBtn = (tabKey: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(tabKey)}
      style={{
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: tab === tabKey ? 600 : 400,
        border: 'none',
        borderBottom: tab === tabKey ? '2px solid var(--color-primary)' : '2px solid transparent',
        background: 'none',
        color: tab === tabKey ? 'var(--color-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

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
          width: 'min(540px, 95vw)',
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
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {isEdit ? t('cuentaBancariaForm.titleEdit') : t('cuentaBancariaForm.titleNew')}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {isEdit
                ? t('cuentaBancariaForm.subtitleEdit', { nombre: cuenta!.nombre })
                : t('cuentaBancariaForm.subtitleNew')
              }
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: 8, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {tabBtn('general', t('cuentaBancariaForm.tabGeneral'))}
          {tabBtn('configuracion', t('cuentaBancariaForm.tabConfig'))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {tab === 'general' && (
            <>
              <FieldGroup label={t('cuentaBancariaForm.labelNombre')}>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder={t('cuentaBancariaForm.nombrePlaceholder')}
                  style={inputStyle}
                  required
                />
              </FieldGroup>

              <FieldGroup label={t('cuentaBancariaForm.labelBanco')}>
                <input
                  type="text"
                  value={form.banco ?? ''}
                  onChange={(e) => set('banco', e.target.value)}
                  placeholder={t('cuentaBancariaForm.bancoPlaceholder')}
                  style={inputStyle}
                />
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FieldGroup label={t('cuentaBancariaForm.labelNumeroCuenta')}>
                  <input
                    type="text"
                    value={form.numero_cuenta ?? ''}
                    onChange={(e) => set('numero_cuenta', e.target.value)}
                    placeholder={t('cuentaBancariaForm.numeroCuentaPlaceholder')}
                    style={inputStyle}
                  />
                </FieldGroup>

                <FieldGroup label={t('cuentaBancariaForm.labelClabe')}>
                  <input
                    type="text"
                    value={form.clabe ?? ''}
                    onChange={(e) => set('clabe', e.target.value)}
                    placeholder={t('cuentaBancariaForm.clabePlaceholder')}
                    maxLength={18}
                    style={inputStyle}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label={t('cuentaBancariaForm.labelNotas')}>
                <textarea
                  value={form.notas ?? ''}
                  onChange={(e) => set('notas', e.target.value)}
                  placeholder={t('cuentaBancariaForm.notasPlaceholder')}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </FieldGroup>
            </>
          )}

          {tab === 'configuracion' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FieldGroup label={t('cuentaBancariaForm.labelTipoCuenta')}>
                  <select
                    value={form.tipo_cuenta ?? 'cheques'}
                    onChange={(e) => set('tipo_cuenta', e.target.value as TipoCuenta)}
                    style={inputStyle}
                  >
                    {TIPO_VALUES.map((v) => (
                      <option key={v} value={v}>{t(`cuentaBancariaForm.tipoCuenta.${v}`)}</option>
                    ))}
                  </select>
                </FieldGroup>

                <FieldGroup label={t('cuentaBancariaForm.labelMoneda')}>
                  <select
                    value={form.moneda ?? 'MXN'}
                    onChange={(e) => set('moneda', e.target.value as Moneda)}
                    style={inputStyle}
                  >
                    {MONEDA_VALUES.map((v) => (
                      <option key={v} value={v}>{MONEDA_LABELS[v]}</option>
                    ))}
                  </select>
                </FieldGroup>
              </div>

              {!isEdit && (
                <FieldGroup label={t('cuentaBancariaForm.labelSaldoInicial')}>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.saldo_inicial ?? 0}
                    onChange={(e) => set('saldo_inicial', parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </FieldGroup>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                <input
                  id="es_principal"
                  type="checkbox"
                  checked={form.es_principal ?? false}
                  onChange={(e) => set('es_principal', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                <label htmlFor="es_principal" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
                  {t('cuentaBancariaForm.labelPrincipal')}
                </label>
              </div>
            </>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
            >
              {t('cuentaBancariaForm.cancel')}
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
              {isPending ? t('cuentaBancariaForm.saving') : isEdit ? t('cuentaBancariaForm.save') : t('cuentaBancariaForm.create')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
