// Paso intermedio de verificación 2FA — usado en Login y CustomerAuthModal
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Mail, Smartphone, RefreshCw } from 'lucide-react'

interface Props {
  method: 'totp' | 'email'
  loading: boolean
  error: string
  onVerify: (code: string) => void
  onResend?: () => void          // solo para method='email'
  onBack: () => void
  theme?: 'modal' | 'page'      // 'modal' usa inline styles, 'page' usa Tailwind
}

export function TwoFACodeStep({ method, loading, error, onVerify, onResend, onBack, theme = 'modal' }: Props) {
  const { t } = useTranslation()
  const [code,     setCode]     = useState('')
  const [resent,   setResent]   = useState(false)
  const [resTimer, setResTimer] = useState(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length === 6) onVerify(code)
  }

  const handleResend = async () => {
    if (!onResend || resTimer > 0) return
    onResend()
    setResent(true)
    let sec = 60
    setResTimer(sec)
    const iv = setInterval(() => {
      sec -= 1
      setResTimer(sec)
      if (sec <= 0) clearInterval(iv)
    }, 1000)
  }

  const isPage = theme === 'page'

  const inp: React.CSSProperties = isPage ? {} : {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: '1px solid #E5E7EB', outline: 'none', color: '#111827', background: 'white',
  }

  const btn = (disabled: boolean): React.CSSProperties => isPage ? {} : {
    padding: '11px 0', borderRadius: 10, border: 'none',
    background: disabled ? '#A7F3D0' : '#1BAE91',
    color: 'white', fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Ícono + descripción */}
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        {method === 'totp'
          ? <Smartphone size={32} color="#1BAE91" style={{ margin: '0 auto 8px' }} />
          : <Mail      size={32} color="#1BAE91" style={{ margin: '0 auto 8px' }} />
        }
        <p style={{ fontSize: 13, color: isPage ? 'var(--text)' : '#374151', fontWeight: 600, marginBottom: 4 }}>
          {t('twoFa.title')}
        </p>
        <p style={{ fontSize: 12, color: isPage ? 'var(--text-secondary)' : '#6B7280' }}>
          {method === 'totp' ? t('twoFa.totpSubtitle') : t('twoFa.emailSubtitle')}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: isPage ? 'var(--color-error-bg)' : '#FEF2F2',
          color: isPage ? 'var(--color-error)' : '#DC2626', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Input de código */}
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder={t('twoFa.codePlaceholder')}
        style={{
          ...inp,
          textAlign: 'center', fontSize: 26, letterSpacing: 10, fontWeight: 700,
          ...(isPage ? {
            width: '100%', padding: '10px 12px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
            outline: 'none',
          } : {}),
        }}
      />

      {/* Botón verificar */}
      <button
        type="submit"
        disabled={loading || code.length < 6}
        style={btn(loading || code.length < 6)}
        className={isPage ? 'w-full py-2.5 rounded-lg text-sm font-semibold' : ''}
      >
        {loading ? t('twoFa.verifying') : (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ShieldCheck size={15} /> {t('twoFa.verify')}
          </span>
        )}
      </button>

      {/* Acciones secundarias */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
            color: isPage ? 'var(--text-secondary)' : '#6B7280',
          }}
        >
          ← {t('twoFa.back')}
        </button>

        {method === 'email' && onResend && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resTimer > 0}
            style={{
              background: 'none', border: 'none', cursor: resTimer > 0 ? 'not-allowed' : 'pointer',
              fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
              color: resTimer > 0
                ? (isPage ? 'var(--text-disabled)' : '#9CA3AF')
                : (isPage ? 'var(--color-primary)' : '#1BAE91'),
            }}
          >
            <RefreshCw size={11} />
            {resTimer > 0
              ? t('twoFa.resendIn', { s: resTimer })
              : (resent ? t('twoFa.resendAgain') : t('twoFa.resend'))}
          </button>
        )}
      </div>
    </form>
  )
}
