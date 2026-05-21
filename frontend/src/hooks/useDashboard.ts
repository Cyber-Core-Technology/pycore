import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { dashboardApi } from '@/api/dashboard-api'

export function useDashboard(rango: '7d' | '30d' | 'mes' = '7d') {
  const sucursal  = useAuthStore((s) => s.sucursalActiva)
  const usuario   = useAuthStore((s) => s.usuario)
  const isStaff   = usuario?.is_staff ?? false
  const isAdmin   = isStaff || (usuario?.roles ?? []).some(
    (r) => ['admin', 'administrador'].includes(r.toLowerCase())
  )

  // Staff / admins pueden ver el dashboard aunque no tengan sucursal activa
  const enabled = isAdmin ? !!usuario : !!sucursal

  return useQuery({
    queryKey:        ['dashboard', sucursal?.id_sucursal ?? 'all', rango],
    queryFn:         () => dashboardApi.getDashboard(sucursal?.id_sucursal, rango),
    enabled,
    refetchInterval: 60_000,
    staleTime:       30_000,
  })
}
