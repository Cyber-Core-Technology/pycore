import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from './routes'

export function SuperAdminRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const usuario = useAuthStore((s) => s.usuario)

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  // Regular users (with empresa) should not access superadmin panel
  if (usuario?.empresa) return <Navigate to={ROUTES.DASHBOARD} replace />
  return <Outlet />
}
