import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Camera, Trash2, Save, Lock, Check, Eye, EyeOff, User, ShieldCheck, ShieldOff, Smartphone, Mail, QrCode } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth-api'
import { mediaUrl } from '@/api/axios-config'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
  outline: 'none', background: 'var(--surface-hover)',
  border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
  marginBottom: 4, display: 'block',
}
const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: '0 0 12px',
}

interface Props { onClose: () => void }

type Tab = 'perfil' | 'seguridad'

export function ProfileDrawer({ onClose }: Props) {
  const { t } = useTranslation()
  const usuario    = useAuthStore((s) => s.usuario)
  const setUsuario = useAuthStore((s) => s.setUsuario)

  const [tab, setTab]               = useState<Tab>('perfil')
  const [nombre, setNombre]         = useState(usuario?.nombre_completo?.split(' ')[0] ?? '')
  const [apPaterno, setApPaterno]   = useState('')
  const [apMaterno, setApMaterno]   = useState('')
  const [telefono, setTelefono]     = useState('')
  const [savedOk, setSavedOk]       = useState(false)
  const [profileError, setProfileError] = useState('')

  // 2FA
  const [twoFaStatus,   setTwoFaStatus]   = useState<{ enabled: boolean; method: string } | null>(null)
  const [twoFaStep,     setTwoFaStep]     = useState<'idle' | 'setup-totp' | 'setup-email' | 'disable'>('idle')
  const [twoFaQr,       setTwoFaQr]       = useState<{ qr_image: string; secret: string } | null>(null)
  const [twoFaCode,     setTwoFaCode]     = useState('')
  const [twoFaLoading,  setTwoFaLoading]  = useState(false)
  const [twoFaMsg,      setTwoFaMsg]      = useState('')
  const [twoFaError,    setTwoFaError]    = useState('')

  const [pwActual, setPwActual]     = useState('')
  const [pwNuevo, setPwNuevo]       = useState('')
  const [pwConfirm, setPwConfirm]   = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [pwOk, setPwOk]             = useState(false)
  const [pwError, setPwError]       = useState('')

  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageDragging, setImageDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Prefill form from backend on mount
  useEffect(() => {
    authApi.me().then((data: any) => {
      setNombre(data.nombre ?? '')
      setApPaterno(data.apellido_paterno ?? '')
      setApMaterno(data.apellido_materno ?? '')
      setTelefono(data.telefono ?? '')
      setTwoFaStatus({ enabled: data.two_fa_enabled ?? false, method: data.two_fa_method ?? '' })
    }).catch(() => {
      // fallback to store data
      const parts = (usuario?.nombre_completo ?? '').split(' ')
      setNombre(parts[0] ?? '')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cropToSquare = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => {
          resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.92)
      }
      img.src = url
    })

  const handleImageFile = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { setProfileError('Formato no permitido (JPG, PNG, WEBP, GIF).'); return }
    if (file.size > 5 * 1024 * 1024) { setProfileError('La imagen excede 5 MB.'); return }
    const squared = await cropToSquare(file)
    setImageFile(squared)
    setImagePreview(URL.createObjectURL(squared))
    setProfileError('')
  }

  const saveFoto = useMutation({
    mutationFn: () => authApi.subirFoto(imageFile!),
    onSuccess: (data) => {
      setImageFile(null)
      setImagePreview(null)
      if (usuario) setUsuario({ ...usuario, foto_url: data.foto_url })
    },
    onError: () => setProfileError(t('profile.photoError')),
  })

  const deleteFoto = useMutation({
    mutationFn: () => authApi.eliminarFoto(),
    onSuccess: () => {
      if (usuario) setUsuario({ ...usuario, foto_url: '' })
    },
  })

  const savePerfil = useMutation({
    mutationFn: () => authApi.actualizarPerfil({ nombre, apellido_paterno: apPaterno, apellido_materno: apMaterno, telefono }),
    onSuccess: (data: any) => {
      if (usuario) setUsuario({ ...usuario, nombre_completo: data.nombre_completo, ...data })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
      setProfileError('')
    },
    onError: () => setProfileError(t('profile.saveError')),
  })

  const savePassword = useMutation({
    mutationFn: () => authApi.cambiarPassword({ password_actual: pwActual, password_nuevo: pwNuevo, password_confirm: pwConfirm }),
    onSuccess: () => {
      setPwActual(''); setPwNuevo(''); setPwConfirm('')
      setPwOk(true)
      setTimeout(() => setPwOk(false), 2500)
      setPwError('')
    },
    onError: (e: any) => {
      const data = e?.response?.data
      if (data?.detail) setPwError(data.detail)
      else if (data?.password_confirm) setPwError(data.password_confirm)
      else if (data?.password_nuevo) setPwError(data.password_nuevo)
      else setPwError(t('profile.passwordChangeError'))
    },
  })

  const handleSavePassword = () => {
    setPwError('')
    if (!pwActual || !pwNuevo || !pwConfirm) { setPwError(t('profile.fillAllFields')); return }
    if (pwNuevo !== pwConfirm) { setPwError(t('profile.passwordsNotMatching')); return }
    if (pwNuevo.length < 8) { setPwError(t('profile.passwordTooShort')); return }
    savePassword.mutate()
  }

  const currentFotoUrl = imagePreview ?? (usuario?.foto_url ? mediaUrl(usuario.foto_url) : null)
  const initials = (usuario?.nombre_completo ?? 'U').charAt(0).toUpperCase()

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 9998 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.title')}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%',
          width: 'min(420px, 100vw)',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
          animation: 'slideInRight 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={16} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('profile.title')}</p>
          </div>
          <button onClick={onClose} aria-label={t('profile.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Foto */}
        <div style={{
          flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '24px 20px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface-hover)',
        }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            {/* Avatar */}
            <div
              onDragOver={(e) => { e.preventDefault(); setImageDragging(true) }}
              onDragLeave={() => setImageDragging(false)}
              onDrop={(e) => { e.preventDefault(); setImageDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f) }}
              onClick={() => fileRef.current?.click()}
              style={{
                width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
                cursor: 'pointer', position: 'relative',
                border: `3px solid ${imageDragging ? 'var(--color-primary)' : 'var(--border)'}`,
                transition: 'border-color 0.15s',
              }}
            >
              {currentFotoUrl ? (
                <img src={currentFotoUrl} alt={t('profile.profilePicture')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-primary)', fontSize: 36, fontWeight: 800, color: 'var(--color-primary-text)',
                }}>
                  {initials}
                </div>
              )}
              {/* Hover overlay */}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.15s',
              }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = '1'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = '0'}
              >
                <Camera size={22} color="white" />
              </div>
            </div>
            {/* Badge camera */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={t('profile.changePhoto')}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-primary)', border: '2px solid var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={13} style={{ color: "var(--color-primary-text)" }} />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
          />
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>
            {usuario?.nombre_completo ?? 'Usuario'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {usuario?.email}
          </p>

          {/* Acciones foto */}
          {(imageFile || usuario?.foto_url) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => saveFoto.mutate()}
                  disabled={saveFoto.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer',
                    opacity: saveFoto.isPending ? 0.7 : 1,
                  }}
                >
                  <Check size={13} /> {saveFoto.isPending ? t('profile.uploading') : t('profile.savePhoto')}
                </button>
              )}
              {!imageFile && usuario?.foto_url && (
                <button
                  type="button"
                  onClick={() => deleteFoto.mutate()}
                  disabled={deleteFoto.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8, fontSize: 13,
                    background: 'var(--color-error-bg)', color: 'var(--color-error)',
                    border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                  }}
                >
                  <Trash2 size={13} /> {t('profile.removePhoto')}
                </button>
              )}
              {imageFile && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 13,
                    background: 'transparent', color: 'var(--text-secondary)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {([
            { id: 'perfil' as Tab, label: t('profile.personalData') },
            { id: 'seguridad' as Tab, label: t('profile.security') },
          ]).map((tabItem) => (
            <button
              key={tabItem.id}
              role="tab"
              aria-selected={tab === tabItem.id}
              onClick={() => setTab(tabItem.id)}
              style={{
                flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, background: 'transparent',
                color: tab === tabItem.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderBottom: tab === tabItem.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {tab === 'perfil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={sectionTitle}>{t('profile.personalInfo')}</p>

              <div>
                <label style={labelStyle}>{t('profile.firstName')}</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} placeholder={t('profile.firstName')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t('profile.lastName')}</label>
                  <input value={apPaterno} onChange={e => setApPaterno(e.target.value)} style={inputStyle} placeholder={t('profile.lastName')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.secondLastName')}</label>
                  <input value={apMaterno} onChange={e => setApMaterno(e.target.value)} style={inputStyle} placeholder={t('profile.secondLastName')} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t('profile.phone')}</label>
                <input
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  style={inputStyle}
                  placeholder="+52 55 0000 0000"
                  type="tel"
                />
              </div>

              <div>
                <label style={labelStyle}>{t('profile.email')}</label>
                <input
                  value={usuario?.email ?? ''}
                  disabled
                  style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{t('profile.emailHint')}</p>
              </div>

              {profileError && (
                <p style={{ fontSize: 13, color: 'var(--color-error)', padding: '8px 12px', borderRadius: 8, background: 'var(--color-error-bg)', margin: 0 }}>
                  ⚠️ {profileError}
                </p>
              )}

              <button
                type="button"
                onClick={() => savePerfil.mutate()}
                disabled={savePerfil.isPending || savedOk}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: savedOk ? '#10B981' : 'var(--color-primary)',
                  color: 'var(--color-primary-text)', border: 'none', cursor: savePerfil.isPending ? 'not-allowed' : 'pointer',
                  opacity: savePerfil.isPending ? 0.7 : 1, transition: 'background 0.2s',
                }}
              >
                {savedOk ? <><Check size={15} /> {t('profile.saved')}</> : savePerfil.isPending ? t('profile.saving') : <><Save size={15} /> {t('profile.saveChanges')}</>}
              </button>
            </div>
          )}

          {tab === 'seguridad' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={sectionTitle}>{t('profile.changePassword')}</p>

              <div>
                <label style={labelStyle}>{t('profile.currentPassword')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwActual}
                    onChange={e => setPwActual(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 38 }}
                    placeholder={t('profile.yourCurrentPassword')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2 }}
                    aria-label={showPw ? t('profile.hidePassword') : t('profile.showPassword')}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t('profile.newPassword')}</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwNuevo}
                  onChange={e => setPwNuevo(e.target.value)}
                  style={inputStyle}
                  placeholder={t('profile.minChars')}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label style={labelStyle}>{t('profile.confirmPassword')}</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: pwConfirm && pwNuevo !== pwConfirm ? 'var(--color-error)' : 'var(--border)',
                  }}
                  placeholder={t('profile.repeatPassword')}
                  autoComplete="new-password"
                />
                {pwConfirm && pwNuevo !== pwConfirm && (
                  <p style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 4 }}>{t('profile.passwordsNoMatch')}</p>
                )}
              </div>

              {/* Indicador de fortaleza */}
              {pwNuevo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[8, 12, 16].map((len, i) => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: pwNuevo.length >= len
                          ? i === 0 ? 'var(--color-error)' : i === 1 ? 'var(--color-warning)' : 'var(--color-success)'
                          : 'var(--border)',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {pwNuevo.length < 8 ? t('profile.passwordVeryShort') : pwNuevo.length < 12 ? t('profile.passwordWeak') : pwNuevo.length < 16 ? t('profile.passwordGood') : t('profile.passwordStrong')}
                  </p>
                </div>
              )}

              {pwError && (
                <p style={{ fontSize: 13, color: 'var(--color-error)', padding: '8px 12px', borderRadius: 8, background: 'var(--color-error-bg)', margin: 0 }}>
                  ⚠️ {pwError}
                </p>
              )}

              <button
                type="button"
                onClick={handleSavePassword}
                disabled={savePassword.isPending || pwOk}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: pwOk ? '#10B981' : 'var(--color-primary)',
                  color: 'var(--color-primary-text)', border: 'none', cursor: savePassword.isPending ? 'not-allowed' : 'pointer',
                  opacity: savePassword.isPending ? 0.7 : 1, transition: 'background 0.2s',
                }}
              >
                {pwOk ? <><Check size={15} /> {t('profile.passwordUpdated')}</> : savePassword.isPending ? t('profile.saving') : <><Lock size={15} /> {t('profile.updatePassword')}</>}
              </button>

              {/* ── 2FA ── */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 4 }}>
                <p style={sectionTitle}>{t('profile.twoFa')}</p>

                {/* Estado actual */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 10, marginBottom: 16,
                  background: twoFaStatus?.enabled ? 'rgba(16,185,129,0.08)' : 'var(--surface-hover)',
                  border: `1px solid ${twoFaStatus?.enabled ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                }}>
                  {twoFaStatus?.enabled
                    ? <ShieldCheck size={18} color="#10B981" />
                    : <ShieldOff   size={18} style={{ color: 'var(--text-disabled)' }} />}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                      {twoFaStatus?.enabled ? t('profile.twoFaEnabled') : t('profile.twoFaDisabled')}
                    </p>
                    {twoFaStatus?.enabled && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                        {t('profile.twoFaMethod')} {twoFaStatus.method === 'totp' ? t('profile.twoFaTotp') : t('profile.twoFaEmailMethod')}
                      </p>
                    )}
                  </div>
                </div>

                {twoFaError && (
                  <p style={{ fontSize: 12, color: 'var(--color-error)', background: 'var(--color-error-bg)', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                    {twoFaError}
                  </p>
                )}
                {twoFaMsg && (
                  <p style={{ fontSize: 12, color: '#10B981', background: 'rgba(16,185,129,0.08)', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                    {twoFaMsg}
                  </p>
                )}

                {/* Idle — no activado */}
                {twoFaStep === 'idle' && !twoFaStatus?.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button type="button" onClick={async () => {
                      setTwoFaLoading(true); setTwoFaError(''); setTwoFaMsg('')
                      try {
                        const d = await authApi.twoFaSetup('totp')
                        setTwoFaQr({ qr_image: d.qr_image!, secret: d.secret! })
                        setTwoFaStep('setup-totp')
                      } catch { setTwoFaError(t('profile.twoFaSetupError')) }
                      finally { setTwoFaLoading(false) }
                    }} disabled={twoFaLoading} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)',
                      background: 'var(--surface)', cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                    }}>
                      <Smartphone size={15} style={{ color: 'var(--color-primary)' }} /> {t('profile.twoFaTotpOption')}
                    </button>
                    <button type="button" onClick={async () => {
                      setTwoFaLoading(true); setTwoFaError(''); setTwoFaMsg('')
                      try {
                        await authApi.twoFaSetup('email')
                        setTwoFaStep('setup-email')
                        setTwoFaMsg(t('profile.twoFaCodeSent'))
                      } catch { setTwoFaError(t('profile.twoFaSendCodeError')) }
                      finally { setTwoFaLoading(false) }
                    }} disabled={twoFaLoading} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)',
                      background: 'var(--surface)', cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                    }}>
                      <Mail size={15} style={{ color: 'var(--color-primary)' }} /> {t('profile.twoFaEmailMethod')}
                    </button>
                  </div>
                )}

                {/* Setup TOTP */}
                {twoFaStep === 'setup-totp' && twoFaQr && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                      {t('profile.twoFaScanQr')}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <img src={`data:image/png;base64,${twoFaQr.qr_image}`} alt="QR 2FA" style={{ width: 160, height: 160, borderRadius: 8, border: '1px solid var(--border)' }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-disabled)', textAlign: 'center', wordBreak: 'break-all' }}>
                      {t('profile.twoFaManualKey')} <strong>{twoFaQr.secret}</strong>
                    </p>
                    <input
                      type="text" inputMode="numeric" maxLength={6} placeholder={t('profile.twoFaCode')}
                      value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 20, letterSpacing: 8, fontWeight: 700 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => { setTwoFaStep('idle'); setTwoFaQr(null); setTwoFaCode(''); setTwoFaError('') }}
                        style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {t('common.cancel')}
                      </button>
                      <button type="button" disabled={twoFaCode.length < 6 || twoFaLoading} onClick={async () => {
                        setTwoFaLoading(true); setTwoFaError('')
                        try {
                          await authApi.twoFaEnable('totp', twoFaCode)
                          setTwoFaStatus({ enabled: true, method: 'totp' })
                          setTwoFaStep('idle'); setTwoFaQr(null); setTwoFaCode('')
                          setTwoFaMsg(t('profile.twoFaActivatedOk'))
                        } catch (e: any) { setTwoFaError(e?.response?.data?.detail ?? t('profile.incorrectCode')) }
                        finally { setTwoFaLoading(false) }
                      }} style={{
                        flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                        background: twoFaCode.length < 6 ? 'var(--surface)' : 'var(--color-primary)',
                        color: twoFaCode.length < 6 ? 'var(--text-disabled)' : 'var(--color-primary-text)',
                        cursor: twoFaCode.length < 6 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
                      }}>
                        {twoFaLoading ? t('profile.twoFaVerifying') : t('profile.twoFaActivate')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Setup Email */}
                {twoFaStep === 'setup-email' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                      {t('profile.twoFaEmailSetup')}
                    </p>
                    <input
                      type="text" inputMode="numeric" maxLength={6} placeholder={t('profile.twoFaCode')}
                      value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 20, letterSpacing: 8, fontWeight: 700 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => { setTwoFaStep('idle'); setTwoFaCode(''); setTwoFaError(''); setTwoFaMsg('') }}
                        style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {t('common.cancel')}
                      </button>
                      <button type="button" disabled={twoFaCode.length < 6 || twoFaLoading} onClick={async () => {
                        setTwoFaLoading(true); setTwoFaError('')
                        try {
                          await authApi.twoFaEnable('email', twoFaCode)
                          setTwoFaStatus({ enabled: true, method: 'email' })
                          setTwoFaStep('idle'); setTwoFaCode('')
                          setTwoFaMsg(t('profile.twoFaActivatedOk'))
                        } catch (e: any) { setTwoFaError(e?.response?.data?.detail ?? t('profile.incorrectCode')) }
                        finally { setTwoFaLoading(false) }
                      }} style={{
                        flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                        background: twoFaCode.length < 6 ? 'var(--surface)' : 'var(--color-primary)',
                        color: twoFaCode.length < 6 ? 'var(--text-disabled)' : 'var(--color-primary-text)',
                        cursor: twoFaCode.length < 6 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
                      }}>
                        {twoFaLoading ? t('profile.twoFaVerifying') : t('profile.twoFaActivate')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Desactivar */}
                {twoFaStep === 'idle' && twoFaStatus?.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {twoFaStep === 'idle' && (
                      <button type="button" onClick={() => { setTwoFaStep('disable'); setTwoFaError(''); setTwoFaMsg('') }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 9,
                          border: '1px solid rgba(239,68,68,0.3)', background: 'var(--color-error-bg)',
                          cursor: 'pointer', fontSize: 13, color: 'var(--color-error)',
                        }}>
                        <ShieldOff size={15} /> {t('profile.twoFaDisableAction')}
                      </button>
                    )}
                  </div>
                )}

                {twoFaStep === 'disable' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                      {t('profile.twoFaDisableMsg')}
                    </p>
                    <input
                      type="text" inputMode="numeric" maxLength={6} placeholder={t('profile.twoFaCode')}
                      value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 20, letterSpacing: 8, fontWeight: 700 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => { setTwoFaStep('idle'); setTwoFaCode(''); setTwoFaError('') }}
                        style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {t('common.cancel')}
                      </button>
                      <button type="button" disabled={twoFaCode.length < 6 || twoFaLoading} onClick={async () => {
                        setTwoFaLoading(true); setTwoFaError('')
                        try {
                          await authApi.twoFaDisable(twoFaCode)
                          setTwoFaStatus({ enabled: false, method: '' })
                          setTwoFaStep('idle'); setTwoFaCode('')
                          setTwoFaMsg(t('profile.twoFaDeactivated'))
                        } catch (e: any) { setTwoFaError(e?.response?.data?.detail ?? t('profile.incorrectCode')) }
                        finally { setTwoFaLoading(false) }
                      }} style={{
                        flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                        background: 'var(--color-error)', color: 'white',
                        cursor: twoFaCode.length < 6 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
                        opacity: twoFaCode.length < 6 ? 0.5 : 1,
                      }}>
                        {twoFaLoading ? t('profile.twoFaDeactivating') : t('profile.twoFaConfirmDisable')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
