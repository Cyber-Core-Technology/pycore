// frontend/src/features/storefront/public/CustomerAuthModal.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, LogIn, UserPlus, Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { TwoFACodeStep } from '@/components/common/TwoFACodeStep'
import { storeCustomerApi } from '@/api/store-customer-api'
import { useStorefrontAuth } from '@/store/storefrontAuthStore'

interface Props {
  slug:      string
  onClose:   () => void
  onSuccess: () => void
}

type RegStep = 'datos' | 'codigo'

export function CustomerAuthModal({ slug, onClose, onSuccess }: Props) {
  const [tab,      setTab]      = useState<'login' | 'registro'>('login')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPass, setShowPass] = useState(false)

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass,  setLoginPass]  = useState('')

  // Registro — paso 1
  const [regNombre,    setRegNombre]    = useState('')
  const [regEmail,     setRegEmail]     = useState('')
  const [regTel,       setRegTel]       = useState('')
  const [regHoney,     setRegHoney]     = useState('')   // honeypot
  const [regPrivacidad, setRegPrivacidad] = useState(false)

  // Registro — paso 2
  const [regStep,    setRegStep]    = useState<RegStep>('datos')
  const [regCodigo,  setRegCodigo]  = useState('')
  const [regPass,    setRegPass]    = useState('')
  const [codTimer,   setCodTimer]   = useState(0)   // segundos restantes para reenvío

  const setAuth = useStorefrontAuth((s) => s.setAuth)

  // 2FA
  const [twoFa,      setTwoFa]      = useState<{ temp_token: string; method: 'totp' | 'email' } | null>(null)
  const [twoFaError, setTwoFaError] = useState('')

  // ── Login ────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data: any = await storeCustomerApi.login(slug, { email: loginEmail, password: loginPass })
      if (data.requires_2fa) {
        setTwoFa({ temp_token: data.temp_token, method: data.two_fa_method })
        return
      }
      setAuth(slug, data.cliente, data.access, data.refresh)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  const handleTwoFaVerify = async (code: string) => {
    if (!twoFa) return
    setTwoFaError('')
    setLoading(true)
    try {
      const data = await storeCustomerApi.twoFaVerify(slug, { temp_token: twoFa.temp_token, code })
      setAuth(slug, data.cliente, data.access, data.refresh)
      onSuccess()
    } catch (err: any) {
      setTwoFaError(err?.response?.data?.detail ?? 'Código incorrecto.')
    } finally {
      setLoading(false)
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    setError('')
    setLoading(true)
    try {
      const data: any = await storeCustomerApi.googleLogin(slug, {
        credential: credentialResponse.credential,
        acepto_privacidad: true,
      })
      if (data.requires_2fa) {
        setTwoFa({ temp_token: data.temp_token, method: data.two_fa_method })
        return
      }
      setAuth(slug, data.cliente, data.access, data.refresh)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Error al iniciar sesión con Google.')
    } finally {
      setLoading(false)
    }
  }

  // ── Registro paso 1: enviar código ───────────────────────────────────────

  const handleEnviarCodigo = async (e: React.FormEvent) => {
    e.preventDefault()
    // Honeypot check (bots llenan este campo)
    if (regHoney) { setRegStep('codigo'); return }

    setError('')
    setLoading(true)
    try {
      await storeCustomerApi.enviarCodigo(slug, { email: regEmail, nombre: regNombre })
      setRegStep('codigo')
      // Contador de 60 s para reenvío
      let t = 60
      setCodTimer(t)
      const iv = setInterval(() => {
        t -= 1
        setCodTimer(t)
        if (t <= 0) clearInterval(iv)
      }, 1000)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo enviar el código.')
    } finally {
      setLoading(false)
    }
  }

  // ── Registro paso 2: verificar código + crear cuenta ────────────────────

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await storeCustomerApi.registro(slug, {
        nombre:            regNombre,
        email:             regEmail,
        password:          regPass,
        telefono:          regTel,
        otp_code:          regCodigo,
        acepto_privacidad: regPrivacidad,
      })
      setAuth(slug, data.cliente, data.access, data.refresh)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Error al registrarse.')
    } finally {
      setLoading(false)
    }
  }

  const resetRegistro = () => {
    setRegStep('datos')
    setRegCodigo('')
    setError('')
  }

  // ── Styles ───────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: '1px solid #E5E7EB', outline: 'none', color: '#111827',
    background: 'white',
  }

  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: '11px 0', borderRadius: 10, border: 'none',
    background: disabled ? '#A7F3D0' : '#1BAE91',
    color: 'white', fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.8 : 1,
    width: '100%',
  })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
            {tab === 'login'
              ? 'Iniciar sesión'
              : regStep === 'datos' ? 'Crear cuenta' : 'Verificar correo'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs — solo si no estamos en paso 2 */}
        {(tab === 'login' || regStep === 'datos') && (
          <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6' }}>
            {(['login', 'registro'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setRegStep('datos') }}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', background: 'none',
                  fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: 'pointer',
                  color: tab === t ? '#1BAE91' : '#6B7280',
                  borderBottom: `2px solid ${tab === t ? '#1BAE91' : 'transparent'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {t === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
                {t === 'login' ? 'Entrar' : 'Registrarse'}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: 'var(--color-error)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* ── 2FA verify ── */}
          {twoFa && (
            <TwoFACodeStep
              method={twoFa.method}
              loading={loading}
              error={twoFaError}
              onVerify={handleTwoFaVerify}
              onResend={twoFa.method === 'email'
                ? () => storeCustomerApi.twoFaResend(slug, twoFa.temp_token)
                : undefined}
              onBack={() => { setTwoFa(null); setTwoFaError('') }}
              theme="modal"
            />
          )}

          {/* ── Google OAuth — visible en Login y Registro paso 1 ── */}
          {!twoFa && (tab === 'login' || (tab === 'registro' && regStep === 'datos')) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('No se pudo completar el inicio de sesión con Google.')}
                text={tab === 'login' ? 'signin_with' : 'signup_with'}
                shape="rectangular"
                width="340"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E5E7EB' }} />
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>o con correo</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E5E7EB' }} />
              </div>
            </div>
          )}

          {/* ── LOGIN ── */}
          {!twoFa && tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Correo electrónico" style={inp} />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="Contraseña" style={{ ...inp, paddingRight: 38 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button type="submit" disabled={loading} style={btn(loading)}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          {/* ── REGISTRO PASO 1: datos + enviar código ── */}
          {!twoFa && tab === 'registro' && regStep === 'datos' && (
            <form onSubmit={handleEnviarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" required value={regNombre} onChange={(e) => setRegNombre(e.target.value)} placeholder="Tu nombre" style={inp} />
              <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="Correo electrónico" style={inp} />
              <input type="tel" value={regTel} onChange={(e) => setRegTel(e.target.value)} placeholder="Teléfono (opcional)" style={inp} />
              {/* Honeypot — oculto visualmente */}
              <input
                type="text"
                value={regHoney}
                onChange={(e) => setRegHoney(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                aria-hidden="true"
              />
              {/* Consentimiento de privacidad */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  required
                  checked={regPrivacidad}
                  onChange={(e) => setRegPrivacidad(e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#1BAE91', flexShrink: 0 }}
                />
                <span>
                  He leído y acepto el{' '}
                  <Link to="/privacidad" target="_blank" style={{ color: '#059669', fontWeight: 600 }}>
                    Aviso de Privacidad
                  </Link>
                  {' '}y los{' '}
                  <Link to="/terminos" target="_blank" style={{ color: '#059669', fontWeight: 600 }}>
                    Términos de Uso
                  </Link>
                  .
                </span>
              </label>
              <button type="submit" disabled={loading || !regPrivacidad} style={btn(loading || !regPrivacidad)}>
                {loading ? 'Enviando...' : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Mail size={15} /> Enviar código al correo
                  </span>
                )}
              </button>
              <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
                Te enviaremos un código de verificación de 6 dígitos.
              </p>
            </form>
          )}

          {/* ── REGISTRO PASO 2: código + contraseña ── */}
          {!twoFa && tab === 'registro' && regStep === 'codigo' && (
            <form onSubmit={handleRegistro} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <ShieldCheck size={32} color="#1BAE91" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                  Código enviado a <strong>{regEmail}</strong>
                </p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>
                  Ingresa el código de 6 dígitos que llegó a tu correo.
                </p>
              </div>

              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                value={regCodigo}
                onChange={(e) => setRegCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                style={{ ...inp, textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: 700 }}
              />

              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} required minLength={6}
                  value={regPass} onChange={(e) => setRegPass(e.target.value)}
                  placeholder="Crea tu contraseña (mín. 6 caracteres)" style={{ ...inp, paddingRight: 38 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button type="submit" disabled={loading || regCodigo.length < 6} style={btn(loading || regCodigo.length < 6)}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={resetRegistro}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 12 }}
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={handleEnviarCodigo as any}
                  disabled={codTimer > 0}
                  style={{ background: 'none', border: 'none', cursor: codTimer > 0 ? 'not-allowed' : 'pointer', color: codTimer > 0 ? '#9CA3AF' : '#1BAE91', fontSize: 12 }}
                >
                  {codTimer > 0 ? `Reenviar en ${codTimer}s` : 'Reenviar código'}
                </button>
              </div>
            </form>
          )}

          <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
            Solo los clientes registrados pueden realizar pedidos.
          </p>
        </div>
      </div>
    </div>
  )
}
