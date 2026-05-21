import { api } from './axios-config'
import type { DashboardData } from '@/types/dashboard.types'

export const dashboardApi = {
  async getDashboard(sucursalId: string | null | undefined, rango: '7d' | '30d' | 'mes' = '7d'): Promise<DashboardData> {
    const params: Record<string, string> = { rango }
    if (sucursalId) params.id_sucursal = sucursalId
    const r = await api.get('/api/v1/sales/ventas/dashboard/', { params })
    return r.data
  },
}
