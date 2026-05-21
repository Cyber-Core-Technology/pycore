import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Loader2, Sun, Moon, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth-api'
import { billingApi } from '@/api/billing-api'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/router/routes'

const TIPO_NEGOCIO_VALUES = ['informal', 'formal_simplificado', 'formal_completo'] as const

const GIRO_VALUES = [
  { value: 'abarrotes',   emoji: '🛒' },
  { value: 'restaurante', emoji: '🍽️' },
  { value: 'ropa',        emoji: '👗' },
  { value: 'zapateria',   emoji: '👟' },
  { value: 'farmacia',    emoji: '💊' },
  { value: 'ferreteria',  emoji: '🔧' },
  { value: 'licoreria',   emoji: '🍺' },
  { value: 'panaderia',   emoji: '🥐' },
  { value: 'electronica', emoji: '📱' },
  { value: 'papeleria',   emoji: '✏️' },
  { value: 'veterinaria', emoji: '🐾' },
  { value: 'estetica',    emoji: '💇' },
  { value: 'gimnasio',    emoji: '🏋️' },
  { value: 'carniceria',  emoji: '🥩' },
  { value: 'flores',      emoji: '🌸' },
  { value: 'joyeria',     emoji: '💍' },
  { value: 'jugueteria',  emoji: '🧸' },
  { value: 'muebleria',   emoji: '🛋️' },
  { value: 'otro',        emoji: '🏪' },
]

function formatPrice(p: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(Number(p))
}

export function RegistroPage() {
  const { t } = useTranslation()
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const isAuth    = useAuthStore((s) => s.isAuthenticated)

  const [theme, setTheme]   = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('pycore_theme') as 'light' | 'dark') ?? 'dark')
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [planes, setPlanes] = useState<any[]>([])

  // Step 0 — negocio
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [tipoNegocio,   setTipoNegocio]   = useState('informal')
  const [giroNegocio,   setGiroNegocio]   = useState('')
  const [rfc,           setRfc]           = useState('')

  // Step 2 — cuenta admin
  const [nombre,          setNombre]          = useState('')
  const [apellido,        setApellido]        = useState('')
  const [email,           setEmail]           = useState('')
  const [telefono,        setTelefono]        = useState('')
  const [password,        setPassword]        = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Step 3 — plan
  const [plan, setPlan] = useState('basico')

  const STEPS = [
    t('registro.steps.negocio'),
    t('registro.steps.cuenta'),
    t('registro.steps.plan'),
  ]

  useEffect(() => {
    if (isAuth) navigate(ROUTES.DASHBOARD, { replace: true })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pycore_theme', theme)
  }, [theme])

  useEffect(() => {
    billingApi.getPlanes().then(setPlanes).catch(() => {})
  }, [])

  const validateStep = (): string => {
    if (step === 0) {
      if (!nombreEmpresa.trim()) return t('registro.errorNegocio')
      if (!giroNegocio) return t('registro.errorGiro')
    }
    if (step === 1) {
      if (!nombre.trim()) return t('registro.errorNombre')
      if (!email.trim()) return t('registro.errorEmail')
      if (password.length < 8) return t('registro.errorPassword')
      if (password !== passwordConfirm) return t('registro.errorPasswordMatch')
    }
    return ''
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await authApi.register({
        nombre_empresa: nombreEmpresa.trim(),
        tipo_negocio:   tipoNegocio,
        giro_negocio:   giroNegocio || undefined,
        rfc:            rfc.trim() || undefined,
        plan,
        nombre:         nombre.trim(),
        apellido_paterno: apellido.trim() || undefined,
        email:          email.trim(),
        telefono:       telefono.trim() || undefined,
        password,
        password_confirm: passwordConfirm,
      })
      setAuth(data.usuario, data.access, data.refresh)
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        navigate(ROUTES.DASHBOARD, { replace: true })
      }
    } catch (err: any) {
      const d = err?.response?.data
      if (typeof d === 'object') {
        const msgs = Object.values(d).flat().join(' ')
        setError(msgs || t('registro.errorDefault'))
      } else {
        setError(t('registro.errorDefault'))
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: 10, border: 'none',
    background: 'var(--color-primary, #0D9373)', color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    opacity: loading ? 0.7 : 1,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Panel izquierdo */}
      <div style={{
        width: 380, flexShrink: 0, background: 'var(--color-primary, #0D9373)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px 40px', gap: 32,
      }} className="registro-left-panel">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>PyCore ERP</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.3 }}>
            {t('registro.tagline')}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 12 }}>
            {t('registro.taglineSubtitle')}
          </p>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            t('registro.features.offline'),
            t('registro.features.inventory'),
            t('registro.features.finance'),
            t('registro.features.store'),
          ].map(f => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
              <Check size={14} color="#fff" strokeWidth={3} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Panel derecho */}
      <div className="registro-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', position: 'relative' }}>
        {/* Theme + login link */}
        <div className="registro-topbar">
          <Link to={ROUTES.LOGIN} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            {t('registro.alreadyHaveAccount')} <strong style={{ color: 'var(--color-primary, #0D9373)' }}>{t('registro.loginLink')}</strong>
          </Link>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                    background: i < step ? 'var(--color-primary, #0D9373)' : i === step ? 'var(--color-primary, #0D9373)' : 'var(--border)',
                    color: i <= step ? '#fff' : 'var(--text-secondary)',
                  }}>
                    {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 11, color: i === step ? 'var(--color-primary, #0D9373)' : 'var(--text-secondary)', fontWeight: i === step ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 60, height: 2, background: i < step ? 'var(--color-primary, #0D9373)' : 'var(--border)', margin: '0 4px', marginBottom: 20 }} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Step 0 — Negocio */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t('registro.step0Title')}</h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{t('registro.step0Subtitle')}</p>
              </div>

              {/* Nombre */}
              <div>
                <label style={labelStyle}>{t('registro.nombreLabel')}</label>
                <input style={inputStyle} placeholder="Ej. Abarrotes El Sol" value={nombreEmpresa}
                  onChange={e => setNombreEmpresa(e.target.value)} autoFocus />
              </div>

              {/* Giro visual */}
              <div>
                <label style={labelStyle}>{t('registro.giroLabel')}</label>
                <div className="giro-grid">
                  {GIRO_VALUES.map(g => {
                    const sel = giroNegocio === g.value
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGiroNegocio(g.value)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 4, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                          border: sel ? '2px solid var(--color-primary, #0D9373)' : '1px solid var(--border)',
                          background: sel ? 'rgba(13,147,115,0.08)' : 'var(--surface)',
                          color: sel ? 'var(--color-primary, #0D9373)' : 'var(--text-secondary)',
                          fontSize: 11, fontWeight: sel ? 700 : 500, lineHeight: 1.2,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{g.emoji}</span>
                        <span style={{ textAlign: 'center' }}>{t(`registro.giros.${g.value}`)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* RFC + tipo negocio en una fila */}
              <div className="grid-2col">
                <div>
                  <label style={labelStyle}>{t('registro.rfcLabel')}</label>
                  <input style={inputStyle} placeholder="XAXX010101000" value={rfc}
                    onChange={e => setRfc(e.target.value.toUpperCase())} maxLength={13} />
                </div>
                <div>
                  <label style={labelStyle}>{t('registro.regimenLabel')}</label>
                  <select style={{ ...inputStyle }} value={tipoNegocio} onChange={e => setTipoNegocio(e.target.value)}>
                    {TIPO_NEGOCIO_VALUES.map(v => (
                      <option key={v} value={v}>{t(`registro.tiposNegocio.${v}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button style={btnPrimary} onClick={handleNext}>
                {t('registro.continue')} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Step 1 — Cuenta */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t('registro.step1Title')}</h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{t('registro.step1Subtitle')}</p>
              <div className="grid-2col">
                <div>
                  <label style={labelStyle}>{t('registro.adminNombreLabel')}</label>
                  <input style={inputStyle} placeholder="Juan" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>{t('registro.apellidoLabel')}</label>
                  <input style={inputStyle} placeholder="García" value={apellido} onChange={e => setApellido(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t('registro.emailLabel')}</label>
                <input style={inputStyle} type="email" placeholder="juan@minegocio.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t('registro.telefonoLabel')}</label>
                <input style={inputStyle} type="tel" placeholder="555 123 4567" value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t('registro.passwordLabel')}</label>
                <input style={inputStyle} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t('registro.passwordConfirmLabel')}</label>
                <input style={inputStyle} type="password" placeholder="••••••••" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setError(''); setStep(0) }}
                  style={{ ...btnPrimary, background: 'var(--border)', color: 'var(--text)', width: 'auto', padding: '12px 18px' }}>
                  <ChevronLeft size={18} />
                </button>
                <button style={btnPrimary} onClick={handleNext}>
                  {t('registro.continue')} <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Plan */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t('registro.step2Title')}</h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{t('registro.step2Subtitle')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(planes.length ? planes : [
                  { id: '1', plan_key: 'basico', nombre: 'Básico', precio_mensual: '649' },
                  { id: '2', plan_key: 'profesional', nombre: 'Profesional', precio_mensual: '1000' },
                  { id: '3', plan_key: 'empresarial', nombre: 'Empresarial', precio_mensual: '1399' },
                ]).map((p: any) => {
                  const selected = plan === p.plan_key
                  return (
                    <div key={p.id} onClick={() => setPlan(p.plan_key)} style={{
                      borderRadius: 12, border: selected ? '2px solid var(--color-primary, #0D9373)' : '1px solid var(--border)',
                      background: selected ? 'rgba(13,147,115,0.06)' : 'var(--surface)',
                      padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{p.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {((t(`registro.planFeatures.${p.plan_key}`, { returnObjects: true }) as string[]) ?? []).slice(0, 2).join(' · ')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{formatPrice(p.precio_mensual)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('registro.perMonth')}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
                {t('registro.stripeNotice')}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setError(''); setStep(1) }}
                  style={{ ...btnPrimary, background: 'var(--border)', color: 'var(--text)', width: 'auto', padding: '12px 18px' }}>
                  <ChevronLeft size={18} />
                </button>
                <button style={btnPrimary} onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Loader2 size={18} className="spin" /> {t('registro.creating')}</> : t('registro.submit')}
                </button>
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 24 }}>
            {t('registro.termsText')}{' '}
            <Link to={ROUTES.TERMINOS} style={{ color: 'var(--color-primary, #0D9373)' }}>{t('registro.termsLink')}</Link>
            {' '}{t('registro.and')}{' '}
            <Link to={ROUTES.PRIVACIDAD} style={{ color: 'var(--color-primary, #0D9373)' }}>{t('registro.privacyLink')}</Link>.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .registro-left-panel { display: none !important; } }

        .registro-right { justify-content: center; padding: 48px 24px; }
        @media (max-width: 768px) { .registro-right { justify-content: flex-start; padding: 72px 16px 40px; } }

        .registro-topbar { position: absolute; top: 20px; right: 24px; display: flex; gap: 12px; align-items: center; z-index: 10; }
        @media (max-width: 768px) { .registro-topbar { top: 16px; right: 16px; } }

        .giro-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        @media (max-width: 520px) { .giro-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 360px) { .giro-grid { grid-template-columns: repeat(2, 1fr); } }

        .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 520px) { .grid-2col { grid-template-columns: 1fr; } }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
