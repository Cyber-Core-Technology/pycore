import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from './routes'

/** Permite el paso solo a usuarios con rol 'admin' o is_staff. */
export function AdminRoute() {
  const usuario = useAuthStore((s) => s.usuario)
  const isAdmin = usuario?.is_staff || (usuario?.roles ?? []).includes('admin')

  if (!isAdmin) return <Navigate to={ROUTES.DASHBOARD} replace />
  return <Outlet />
}
