import { Building2, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth-api'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/router/routes'

export function SinSucursalPage() {
  const logout   = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authApi.logout().catch(() => {})
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
        background: 'var(--bg)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Building2 size={32} style={{ color: '#F87171' }} />
      </div>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          Sin acceso a sucursales
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 360 }}>
          Tu cuenta no tiene sucursales asignadas. Contacta al administrador de tu empresa para que te asigne acceso.
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 10,
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <LogOut size={15} />
        Cerrar sesión
      </button>
    </div>
  )
}
