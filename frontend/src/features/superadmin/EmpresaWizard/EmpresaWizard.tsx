import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useCrearEmpresa } from '@/hooks/useSuperAdmin'
import { superadminApi } from '@/api/superadmin-api'
import type { WizardStep1, WizardStep2, PlanEmpresa, TipoNegocio } from '@/types/superadmin.types'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const PLAN_VALUES: PlanEmpresa[] = ['basico', 'profesional', 'empresarial', 'elite']
const PLAN_COLORS: Record<PlanEmpresa, { color: string; bg: string }> = {
  basico:      { color: '#6B7280',                bg: 'rgba(107,114,128,0.12)' },
  profesional: { color: 'var(--color-info)',       bg: 'var(--color-info-bg)'   },
  empresarial: { color: '#A855F7',                 bg: 'rgba(168,85,247,0.12)'  },
  elite:       { color: 'var(--color-warning)',     bg: 'var(--color-warning-bg)'},
}

const TIPO_VALUES: TipoNegocio[] = ['informal', 'formal_simplificado', 'formal_completo']

function PlanBadge({ plan }: { plan: PlanEmpresa }) {
  const { t } = useTranslation()
  const c = PLAN_COLORS[plan] ?? PLAN_COLORS.basico
  return (
    <span style={{ padding: '2px 10px', borderRadius: 999, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
      {t(`superadmin.wizard.plans.${plan}`, { defaultValue: plan })}
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
      {steps.map((label, i) => {
        const active = i === current
        const done   = i < current
        const circleColor = (active || done) ? 'var(--color-warning)' : 'var(--border)'
        const textColor   = (active || done) ? 'var(--color-warning)' : 'var(--text-secondary)'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `2px solid ${circleColor}`,
                background: done ? 'var(--color-warning)' : active ? 'var(--color-warning-bg)' : 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
              }}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--color-warning)' : 'var(--text-secondary)' }}>{i + 1}</span>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: textColor, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 80, height: 2,
                background: i < current ? 'var(--color-warning)' : 'var(--border)',
                margin: '0 4px', marginBottom: 18, transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const DEFAULT_STEP1: WizardStep1 = {
  nombre: '', nombre_comercial: '', rfc: '', tipo_negocio: 'informal', plan: 'basico', email: '', telefono: '',
}

const DEFAULT_STEP2: WizardStep2 = {
  nombre: '', apellido_paterno: '', apellido_materno: '', email: '', username: '', telefono: '', password: '', password_confirm: '',
}

export function EmpresaWizard({ onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [step1, setStep1] = useState<WizardStep1>(DEFAULT_STEP1)
  const [step2, setStep2] = useState<WizardStep2>(DEFAULT_STEP2)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [createdNombre, setCreatedNombre] = useState('')

  const crearEmpresa = useCrearEmpresa()

  const STEP_LABELS = [
    t('superadmin.wizard.steps.business'),
    t('superadmin.wizard.steps.admin'),
    t('superadmin.wizard.steps.confirm'),
  ]

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!step1.nombre.trim()) e.nombre = t('superadmin.wizard.step1.nameRequired')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: Record<string, string> = {}
    if (!step2.nombre.trim())    e.nombre   = t('superadmin.wizard.step2.nameRequired')
    if (!step2.email.trim())     e.email    = t('superadmin.wizard.step2.emailRequired')
    if (!step2.username.trim())  e.username = t('superadmin.wizard.step2.usernameRequired')
    if (!step2.password)         e.password = t('superadmin.wizard.step2.passwordRequired')
    else if (step2.password.length < 8) e.password = t('superadmin.wizard.step2.passwordShort')
    if (step2.password !== step2.password_confirm) e.password_confirm = t('superadmin.wizard.step2.passwordMismatch')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (step === 0 && !validateStep1()) return
    if (step === 1 && !validateStep2()) return
    setStep(s => s + 1)
  }

  const handleCreate = async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await crearEmpresa.mutateAsync({
        nombre_empresa: step1.nombre,
        rfc: step1.rfc || undefined,
        tipo_negocio: step1.tipo_negocio,
        email: step2.email,
        username: step2.username,
        nombre: step2.nombre,
        apellido_paterno: step2.apellido_paterno || undefined,
        apellido_materno: step2.apellido_materno || undefined,
        telefono: step2.telefono || undefined,
        password: step2.password,
        password_confirm: step2.password_confirm,
      })

      const empresaId = result?.usuario?.empresa?.id_empresa
      setCreatedNombre(result?.usuario?.empresa?.nombre ?? step1.nombre)

      if (empresaId && (step1.plan !== 'basico' || step1.nombre_comercial || step1.email || step1.telefono)) {
        await superadminApi.actualizarEmpresa(empresaId, {
          plan: step1.plan,
          nombre_comercial: step1.nombre_comercial || undefined,
          email: step1.email || undefined,
          telefono: step1.telefono || undefined,
        })
      }

      setStatus('success')
    } catch (err: unknown) {
      setStatus('error')
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: unknown } }
        const data = axiosErr.response?.data
        if (data && typeof data === 'object') {
          const messages = Object.values(data as Record<string, string[]>).flat().join(' ')
          setErrorMsg(messages || t('superadmin.wizard.createError'))
        } else {
          setErrorMsg(t('superadmin.wizard.createError'))
        }
      } else {
        setErrorMsg(t('superadmin.wizard.unexpectedError'))
      }
    }
  }

  const handleClose = () => {
    if (status === 'success') onSuccess()
    onClose()
  }

  const set1 = (k: keyof WizardStep1) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setStep1(prev => ({ ...prev, [k]: e.target.value }))
    setErrors(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  const set2 = (k: keyof WizardStep2) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setStep2(prev => ({ ...prev, [k]: e.target.value }))
    setErrors(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  const currentPlanColor = PLAN_COLORS[step1.plan] ?? PLAN_COLORS.basico

  const content = (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 9998 }} />

      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(680px, 95vw)', height: 'min(90vh, 700px)',
          background: 'var(--surface)', borderRadius: 16, zIndex: 9999,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 0', borderBottom: '1px solid var(--border)', paddingBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {t('superadmin.wizard.title')}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('superadmin.wizard.subtitle')}
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {status !== 'success' && <StepIndicator current={step} steps={STEP_LABELS} />}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ── STEP 1 ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label={t('superadmin.wizard.step1.businessName')}>
                  <input
                    style={{ ...inputStyle, borderColor: errors.nombre ? 'var(--color-error)' : undefined }}
                    value={step1.nombre}
                    onChange={set1('nombre')}
                    placeholder={t('superadmin.wizard.step1.businessNamePlaceholder')}
                  />
                  {errors.nombre && <span style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 2 }}>{errors.nombre}</span>}
                </Field>
                <Field label={t('superadmin.wizard.step1.comercialName')}>
                  <input style={inputStyle} value={step1.nombre_comercial} onChange={set1('nombre_comercial')} placeholder={t('superadmin.wizard.step1.comercialNamePlaceholder')} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label={t('superadmin.wizard.step1.rfc')}>
                  <input
                    style={inputStyle}
                    value={step1.rfc}
                    onChange={e => setStep1(p => ({ ...p, rfc: e.target.value.toUpperCase().slice(0, 13) }))}
                    placeholder="RFC000000XXX"
                    maxLength={13}
                  />
                </Field>
                <Field label={t('superadmin.wizard.step1.tipoNegocio')}>
                  <select style={inputStyle} value={step1.tipo_negocio} onChange={set1('tipo_negocio')}>
                    {TIPO_VALUES.map(v => (
                      <option key={v} value={v}>{t(`superadmin.wizard.tipoNegocio.${v}`, { defaultValue: v })}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label={t('superadmin.wizard.step1.plan')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select style={{ ...inputStyle, flex: 1 }} value={step1.plan} onChange={set1('plan')}>
                    {PLAN_VALUES.map(v => (
                      <option key={v} value={v}>{t(`superadmin.wizard.plans.${v}`, { defaultValue: v })}</option>
                    ))}
                  </select>
                  <span style={{ padding: '6px 14px', borderRadius: 999, background: currentPlanColor.bg, color: currentPlanColor.color, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {t(`superadmin.wizard.plans.${step1.plan}`, { defaultValue: step1.plan })}
                  </span>
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label={t('superadmin.wizard.step1.contactEmail')}>
                  <input style={inputStyle} type="email" value={step1.email} onChange={set1('email')} placeholder="contacto@empresa.com" />
                </Field>
                <Field label={t('superadmin.wizard.step1.phone')}>
                  <input style={inputStyle} value={step1.telefono} onChange={set1('telefono')} placeholder="+52 55 0000 0000" />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label={t('superadmin.wizard.step2.firstName')}>
                  <input
                    style={{ ...inputStyle, borderColor: errors.nombre ? 'var(--color-error)' : undefined }}
                    value={step2.nombre}
                    onChange={set2('nombre')}
                    placeholder="Juan"
                  />
                  {errors.nombre && <span style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 2 }}>{errors.nombre}</span>}
                </Field>
                <Field label={t('superadmin.wizard.step2.lastName')}>
                  <input style={inputStyle} value={step2.apellido_paterno} onChange={set2('apellido_paterno')} placeholder="García" />
                </Field>
                <Field label={t('superadmin.wizard.step2.secondLastName')}>
                  <input style={inputStyle} value={step2.apellido_materno} onChange={set2('apellido_materno')} placeholder="López" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label={t('superadmin.wizard.step2.email')}>
                  <input
                    style={{ ...inputStyle, borderColor: errors.email ? 'var(--color-error)' : undefined }}
                    type="email"
                    value={step2.email}
                    onChange={set2('email')}
                    placeholder="admin@empresa.com"
                  />
                  {errors.email && <span style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 2 }}>{errors.email}</span>}
                </Field>
                <Field label={t('superadmin.wizard.step2.username')}>
                  <input
                    style={{ ...inputStyle, borderColor: errors.username ? 'var(--color-error)' : undefined }}
                    value={step2.username}
                    onChange={set2('username')}
                    placeholder="admin_empresa"
                  />
                  {errors.username && <span style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 2 }}>{errors.username}</span>}
                </Field>
              </div>

              <Field label={t('superadmin.wizard.step2.phone')}>
                <input style={inputStyle} value={step2.telefono} onChange={set2('telefono')} placeholder="+52 55 0000 0000" />
              </Field>

              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t('superadmin.wizard.step2.adminNote')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label={t('superadmin.wizard.step2.password')}>
                  <input
                    style={{ ...inputStyle, borderColor: errors.password ? 'var(--color-error)' : undefined }}
                    type="password"
                    value={step2.password}
                    onChange={set2('password')}
                    placeholder={t('superadmin.wizard.step2.passwordPlaceholder')}
                  />
                  {errors.password && <span style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 2 }}>{errors.password}</span>}
                </Field>
                <Field label={t('superadmin.wizard.step2.confirmPassword')}>
                  <input
                    style={{ ...inputStyle, borderColor: errors.password_confirm ? 'var(--color-error)' : undefined }}
                    type="password"
                    value={step2.password_confirm}
                    onChange={set2('password_confirm')}
                    placeholder={t('superadmin.wizard.step2.confirmPasswordPlaceholder')}
                  />
                  {errors.password_confirm && <span style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 2 }}>{errors.password_confirm}</span>}
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 2 && status !== 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Company card */}
              <div style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {t('superadmin.wizard.step3.companyTitle')}
                  </h3>
                  <PlanBadge plan={step1.plan} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: t('superadmin.wizard.step3.name'),         value: step1.nombre },
                    { label: t('superadmin.wizard.step3.type'),         value: t(`superadmin.wizard.tipoNegocio.${step1.tipo_negocio}`, { defaultValue: step1.tipo_negocio }) },
                    { label: t('superadmin.wizard.step3.rfc'),          value: step1.rfc || '—' },
                    { label: t('superadmin.wizard.step3.email'),        value: step1.email || '—' },
                    step1.nombre_comercial ? { label: t('superadmin.wizard.step3.comercialName'), value: step1.nombre_comercial } : null,
                    step1.telefono ? { label: t('superadmin.wizard.step3.phone'), value: step1.telefono } : null,
                  ].filter(Boolean).map((item) => (
                    <div key={item!.label}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                        {item!.label}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{item!.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin card */}
              <div style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {t('superadmin.wizard.step3.adminTitle')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: t('superadmin.wizard.step3.fullName'), value: [step2.nombre, step2.apellido_paterno, step2.apellido_materno].filter(Boolean).join(' ') },
                    { label: t('superadmin.wizard.step3.email'),    value: step2.email },
                    { label: t('superadmin.wizard.step3.username'), value: step2.username },
                    step2.telefono ? { label: t('superadmin.wizard.step3.phone'), value: step2.telefono } : null,
                  ].filter(Boolean).map((item) => (
                    <div key={item!.label}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                        {item!.label}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{item!.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error */}
              {status === 'error' && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--color-error)', fontSize: 13 }}>
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* ── SUCCESS ── */}
          {status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: '24px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-success-bg)', border: '2px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                  {t('superadmin.wizard.success.title')}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
                  {t('superadmin.wizard.success.message', { name: createdNombre })}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {t('superadmin.wizard.success.hint')}
                </p>
              </div>
              <button
                onClick={handleClose}
                style={{ marginTop: 8, padding: '10px 28px', borderRadius: 10, border: 'none', background: 'var(--color-success)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('superadmin.wizard.success.close')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {status !== 'success' && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--surface)' }}>
            <button
              onClick={step === 0 ? handleClose : () => { setStep(s => s - 1); setErrors({}) }}
              style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}
            >
              {step === 0 ? t('superadmin.wizard.cancel') : t('superadmin.wizard.back')}
            </button>

            {step < 2 ? (
              <button
                onClick={handleNext}
                style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: 'var(--color-warning)', color: '#1C1917', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('superadmin.wizard.next')}
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={status === 'loading'}
                style={{
                  padding: '9px 24px', borderRadius: 9, border: 'none',
                  background: status === 'loading' ? 'rgba(245,158,11,0.5)' : 'var(--color-warning)',
                  color: '#1C1917', fontSize: 14, fontWeight: 600,
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {status === 'loading' ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(28,25,23,0.3)', borderTopColor: '#1C1917', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    {t('superadmin.wizard.creating')}
                  </>
                ) : (
                  t('superadmin.wizard.create')
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )

  return createPortal(content, document.body)
}
