import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Loader2, Sun, Moon, Store, Building2 } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { TwoFACodeStep } from '@/components/common/TwoFACodeStep'
import { authApi }       from '@/api/auth-api'
import { useLogin }      from '@/hooks/useAuth'
import { useAuthStore }  from '@/store/authStore'
import { useStorefrontAuth } from '@/store/storefrontAuthStore'
import { storeCustomerApi }  from '@/api/store-customer-api'
import { SplashScreen }  from '@/components/common/SplashScreen'
import { SucursalPickerModal } from '@/features/auth/SucursalPickerModal/SucursalPickerModal'
import { ROUTES }        from '@/router/routes'

type LoginTab = 'erp' | 'cliente'

export function Login() {
  const { t } = useTranslation()
  const [tab,        setTab]        = useState<LoginTab>('erp')

  // ERP
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  // Cliente storefront
  const [cSlug,      setCSlug]      = useState('')
  const [cEmail,     setCEmail]     = useState('')
  const [cPass,      setCPass]      = useState('')
  const [cShowPass,  setCShowPass]  = useState(false)
  const [cLoading,   setCLoading]   = useState(false)
  const [cError,     setCError]     = useState('')

  // 2FA — ERP
  const [erpTwoFa, setErpTwoFa] = useState<{ temp_token: string; method: 'totp' | 'email' } | null>(null)
  const [erpTwoFaError, setErpTwoFaError] = useState('')

  // 2FA — Cliente
  const [cTwoFa, setCTwoFa] = useState<{ temp_token: string; method: 'totp' | 'email'; slug: string } | null>(null)
  const [cTwoFaError, setCTwoFaError] = useState('')

  const { login, loading, error, showSplash, handleSplashFinish, pendingSucursales, selectSucursal } = useLogin()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth         = useStorefrontAuth((s) => s.setAuth)
  const navigate        = useNavigate()

  // Solo redirige si YA estaba autenticado al cargar la página (ej. volver al /login con sesión activa)
  const mountedAuth = useRef(isAuthenticated)
  useEffect(() => {
    if (mountedAuth.current) {
      navigate(ROUTES.DASHBOARD, { replace: true })
    }
  }, [navigate])

  const handleClienteLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCError('')
    const slug = cSlug.trim().toLowerCase().replace(/^\/p\//, '')
    if (!slug) { setCError(t('login.storeIdRequired')); return }
    setCLoading(true)
    try {
      const data: any = await storeCustomerApi.login(slug, { email: cEmail.trim(), password: cPass })
      if (data.requires_2fa) {
        setCTwoFa({ temp_token: data.temp_token, method: data.two_fa_method, slug })
        return
      }
      setAuth(slug, data.cliente, data.access, data.refresh)
      navigate(`/p/${slug}/cuenta`, { replace: true })
    } catch (err: any) {
      setCError(err?.response?.data?.detail ?? t('login.wrongCredentials'))
    } finally {
      setCLoading(false)
    }
  }

  const handleClienteTwoFaVerify = async (code: string) => {
    if (!cTwoFa) return
    setCTwoFaError('')
    setCLoading(true)
    try {
      const data = await storeCustomerApi.twoFaVerify(cTwoFa.slug, { temp_token: cTwoFa.temp_token, code })
      setAuth(cTwoFa.slug, data.cliente, data.access, data.refresh)
      navigate(`/p/${cTwoFa.slug}/cuenta`, { replace: true })
    } catch (err: any) {
      setCTwoFaError(err?.response?.data?.detail ?? t('login.incorrectCode'))
    } finally {
      setCLoading(false)
    }
  }

  const handleClienteGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    const slug = cSlug.trim().toLowerCase().replace(/^\/p\//, '')
    if (!slug) { setCError(t('login.storeIdFirst')); return }
    setCError('')
    setCLoading(true)
    try {
      const data: any = await storeCustomerApi.googleLogin(slug, {
        credential: credentialResponse.credential,
        acepto_privacidad: true,
      })
      if (data.requires_2fa) {
        setCTwoFa({ temp_token: data.temp_token, method: data.two_fa_method, slug })
        return
      }
      setAuth(slug, data.cliente, data.access, data.refresh)
      navigate(`/p/${slug}/cuenta`, { replace: true })
    } catch (err: any) {
      setCError(err?.response?.data?.detail ?? t('login.googleError'))
    } finally {
      setCLoading(false)
    }
  }

  const [dark, setDark] = useState(() => {
    const theme = localStorage.getItem('pycore_theme')
    return theme === 'dark'
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('pycore_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('pycore_theme', 'light')
    }
  }, [dark])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!email.trim()) {
      setFieldError(t('login.emailRequired'))
      document.getElementById('email')?.focus()
      return
    }
    if (!password) {
      setFieldError(t('login.passwordRequired'))
      document.getElementById('password')?.focus()
      return
    }
    setFieldError(null)

    const result = await login({ email: email.trim(), password })
    if (result && (result as any).requires_2fa) {
      setErpTwoFa({ temp_token: (result as any).temp_token, method: (result as any).two_fa_method })
      return
    }
    if (!result) {
      setPassword('')
      setTimeout(() => document.getElementById('password')?.focus(), 50)
    }
  }

  const handleErpTwoFaVerify = async (code: string) => {
    if (!erpTwoFa) return
    setErpTwoFaError('')
    try {
      const data = await authApi.twoFaVerify({ temp_token: erpTwoFa.temp_token, code })
      if (data.trust_token) {
        localStorage.setItem('pycore_2fa_trust', data.trust_token)
      }
      useAuthStore.getState().setAuth(data.usuario, data.access, data.refresh)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err: any) {
      setErpTwoFaError(err?.response?.data?.detail ?? t('login.incorrectCode'))
    }
  }

  const displayError = fieldError ?? error

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      {pendingSucursales.length > 1 && (
        <SucursalPickerModal sucursales={pendingSucursales} onSelect={selectSucursal} />
      )}

      <div className="min-h-screen flex relative" style={{ background: 'var(--sidebar-bg)', visibility: showSplash ? 'hidden' : 'visible' }}>

        {/* Toggle dark/light */}
        <button
          onClick={() => setDark(!dark)}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg transition-colors"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
          title={dark ? t('login.toggleLight') : t('login.toggleDark')}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Panel izquierdo */}
        <div
          className="hidden lg:flex flex-col justify-between p-12 w-2/5"
          style={{ background: 'linear-gradient(160deg, #0B2A1E 0%, #0B1A14 100%)' }}
        >
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="PyCore ERP" style={{ width: 36, height: 36 }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#E6F2EE' }}>PyCore ERP</p>
              <p className="text-xs" style={{ color: 'rgba(167,207,197,0.5)' }}>{t('login.tagline')}</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold leading-tight mb-4" style={{ color: '#E6F2EE' }}>
              {t('login.headline')}
              <br />
              <span style={{ color: 'var(--color-primary)' }}>{t('login.headlineHighlight')}</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(167,207,197,0.6)' }}>
              {t('login.description')}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[t('login.feature1'), t('login.feature2'), t('login.feature3')].map((f) => (
              <p key={f} className="text-sm" style={{ color: 'rgba(167,207,197,0.55)' }}>{f}</p>
            ))}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex flex-1 items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
          <div className="w-full max-w-sm">

            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <img src="/favicon.svg" alt="PyCore ERP" style={{ width: 32, height: 32 }} />
              <p className="font-semibold" style={{ color: 'var(--text)' }}>PyCore ERP</p>
            </div>

            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
              {t('login.title')}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t('login.subtitle')}
            </p>

            {/* Tabs ERP / Cliente */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 12, background: 'var(--surface)' }}>
              {([
                { key: 'erp',     label: t('login.tabEmployee'), icon: Building2 },
                { key: 'cliente', label: t('login.tabClient'),   icon: Store },
              ] as { key: LoginTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    background: tab === key ? 'var(--bg)' : 'transparent',
                    color: tab === key ? 'var(--color-primary)' : 'var(--text-secondary)',
                    boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── 2FA ERP ── */}
            {tab === 'erp' && erpTwoFa && (
              <TwoFACodeStep
                method={erpTwoFa.method}
                loading={loading}
                error={erpTwoFaError}
                onVerify={handleErpTwoFaVerify}
                onResend={erpTwoFa.method === 'email'
                  ? () => authApi.twoFaResend(erpTwoFa.temp_token)
                  : undefined}
                onBack={() => { setErpTwoFa(null); setErpTwoFaError('') }}
                theme="page"
              />
            )}

            {/* ── Formulario ERP ── */}
            {tab === 'erp' && !erpTwoFa && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('login.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldError(null) }}
                  placeholder={t('login.emailPlaceholder')}
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${fieldError && !email ? 'var(--color-error)' : 'var(--border)'}`,
                    color: 'var(--text)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e)  => (e.target.style.borderColor = fieldError && !email ? 'var(--color-error)' : 'var(--border)')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldError(null) }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all"
                    style={{
                      background: 'var(--surface)',
                      border: `1px solid ${error ? 'var(--color-error)' : 'var(--border)'}`,
                      color: 'var(--text)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e)  => (e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--border)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {displayError && (
                <div
                  className="px-4 py-3 rounded-lg text-sm animate-fadeIn"
                  style={{
                    background: 'var(--color-error-bg)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#F87171',
                  }}
                >
                  {displayError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all mt-2"
                style={{
                  background: loading ? 'rgba(24,174,145,0.6)' : 'var(--color-primary)',
                  color: 'var(--color-primary-text)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('login.submitting')}
                  </>
                ) : t('login.submit')}
              </button>

              <Link
                to={ROUTES.REGISTRO}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                {t('login.createAccount')}
              </Link>
            </form>
            )}

            {/* ── 2FA Cliente ── */}
            {tab === 'cliente' && cTwoFa && (
              <TwoFACodeStep
                method={cTwoFa.method}
                loading={cLoading}
                error={cTwoFaError}
                onVerify={handleClienteTwoFaVerify}
                onResend={cTwoFa.method === 'email'
                  ? () => storeCustomerApi.twoFaResend(cTwoFa.slug, cTwoFa.temp_token)
                  : undefined}
                onBack={() => { setCTwoFa(null); setCTwoFaError('') }}
                theme="page"
              />
            )}

            {/* ── Formulario Cliente ── */}
            {tab === 'cliente' && !cTwoFa && (
            <form onSubmit={handleClienteLogin} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('login.storeId')}
                </label>
                <input
                  type="text"
                  value={cSlug}
                  onChange={(e) => { setCSlug(e.target.value); setCError('') }}
                  placeholder={t('login.storePlaceholder')}
                  autoComplete="off"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
                />
                <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                  {t('login.storeIdHint')}<strong>{t('login.storeIdHintBold')}</strong>
                </p>
              </div>

              {/* Google Sign-In */}
              <div className="flex flex-col items-center gap-3">
                <GoogleLogin
                  onSuccess={handleClienteGoogle}
                  onError={() => setCError(t('login.googleError'))}
                  text="signin_with"
                  shape="rectangular"
                  width="368"
                />
                <div className="flex items-center gap-2 w-full">
                  <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>{t('login.orWithEmail')}</span>
                  <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('login.email')}
                </label>
                <input
                  type="email"
                  value={cEmail}
                  onChange={(e) => { setCEmail(e.target.value); setCError('') }}
                  placeholder={t('login.clientEmailPlaceholder')}
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    type={cShowPass ? 'text' : 'password'}
                    value={cPass}
                    onChange={(e) => { setCPass(e.target.value); setCError('') }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface)', border: `1px solid ${cError ? 'var(--color-error)' : 'var(--border)'}`, color: 'var(--text)' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e)  => (e.target.style.borderColor = cError ? 'var(--color-error)' : 'var(--border)')}
                  />
                  <button type="button" onClick={() => setCShowPass(!cShowPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {cShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {cError && (
                <div className="px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                  {cError}
                </div>
              )}

              <button
                type="submit"
                disabled={cLoading}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold mt-2"
                style={{
                  background: cLoading ? 'rgba(24,174,145,0.6)' : 'var(--color-primary)',
                  color: 'var(--color-primary-text)', cursor: cLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {cLoading ? <><Loader2 size={16} className="animate-spin" />{t('login.submitting')}</> : t('login.clientSubmit')}
              </button>

              <p className="text-xs text-center" style={{ color: 'var(--text-disabled)' }}>
                {t('login.noAccount')}
              </p>
            </form>
            )}

            <p className="text-xs text-center mt-8" style={{ color: 'var(--text-disabled)' }}>
              PyCore ERP v1.0 · Plan Profesional
            </p>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-disabled)' }}>
              <Link to="/privacidad" style={{ color: 'var(--text-disabled)', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-disabled)')}
              >{t('login.privacy')}</Link>
              {' · '}
              <Link to="/terminos" style={{ color: 'var(--text-disabled)', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-disabled)')}
              >{t('login.terms')}</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}