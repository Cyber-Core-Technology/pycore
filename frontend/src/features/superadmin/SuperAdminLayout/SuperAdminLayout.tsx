import { useState, useEffect } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { Sun, Moon, Building2, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth-api'
import { ROUTES } from '@/router/routes'
import { useTranslation } from 'react-i18next'

export function SuperAdminLayout() {
  const usuario = useAuthStore((s) => s.usuario)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('pycore_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('pycore_theme', 'light')
    }
  }, [dark])

  const handleLogout = async () => {
    await authApi.logout()
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          height: 56,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Left: Logo + Title + Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Badge */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--color-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: '#1C1917',
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.05em',
              }}
            >
              PA
            </span>
          </div>

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--text)',
                lineHeight: 1.2,
              }}
            >
              PyCore{' '}
              <span style={{ color: 'var(--color-warning)' }}>Admin</span>
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                lineHeight: 1.2,
              }}
            >
              {t('superadmin.layout.adminPanel')}
            </span>
          </div>
        </div>

        {/* Center nav tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { to: ROUTES.SUPERADMIN,       label: t('superadmin.layout.companies'),  Icon: Building2 },
            { to: ROUTES.SUPERADMIN_AUDIT, label: t('superadmin.layout.auditoria'),  Icon: ShieldCheck },
          ].map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.SUPERADMIN}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 7,
                fontSize: 13, fontWeight: 500,
                background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                color:      isActive ? '#F59E0B' : 'var(--text-secondary)',
                textDecoration: 'none', transition: 'all 0.15s',
              })}
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right: User + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {usuario && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(245,158,11,0.15)',
                  border: '1.5px solid rgba(245,158,11,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--color-warning)', fontWeight: 600 }}>
                  {usuario.nombre_completo?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
                  {usuario.nombre_completo || usuario.username}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-warning)', lineHeight: 1.2 }}>
                  {t('superadmin.layout.superadmin')}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setDark(!dark)}
            title={dark ? t('superadmin.layout.lightMode') : t('superadmin.layout.darkMode')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div
            style={{
              width: 1,
              height: 24,
              background: 'var(--border)',
            }}
          />

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('superadmin.layout.logout')}
          </button>
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 40px',
          background: 'var(--bg)',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
