import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { ROUTES } from './routes'

const IDLE_MS = 30 * 60 * 1000 // 30 minutos

function IdleWatcher() {
  const logout   = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  useIdleTimeout(() => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }, IDLE_MS)

  return null
}

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const usuario         = useAuthStore((s) => s.usuario)
  const sucursalActiva  = useAuthStore((s) => s.sucursalActiva)

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (!usuario?.empresa) return <Navigate to={ROUTES.SUPERADMIN} replace />

  // Admins y staff bypasean el gate de sucursal
  const roles = usuario.roles ?? []
  const isAdmin = usuario.is_staff ||
    roles.some((r) => ['admin', 'administrador'].includes(r.toLowerCase()))

  if (!isAdmin) {
    const sucursales = usuario.sucursales ?? []
    if (sucursales.length === 0) return <Navigate to={ROUTES.SIN_SUCURSAL} replace />
    if (!sucursalActiva) return <Navigate to={ROUTES.LOGIN} replace />
  }

  return (
    <>
      <IdleWatcher />
      <Outlet />
    </>
  )
}
