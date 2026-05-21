import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/axios-config'

export interface ReportesFiltros {
  fecha_desde?: string
  fecha_hasta?: string
  id_sucursal?: string
}

export interface SalesReportes {
  kpis: {
    total_ventas:    number
    num_ventas:      number
    ticket_promedio: number
  }
  ventas_por_dia:    { dia: string; total: number; cantidad: number }[]
  ticket_por_dia:    { dia: string; promedio: number }[]
  ventas_por_metodo: { metodo: string; total: number; cantidad: number }[]
  top_productos:     { nombre: string; total: number; cantidad: number }[]
  top_clientes:      { nombre: string; total: number; cantidad: number }[]
}

export function useSalesReportes(filtros?: ReportesFiltros) {
  return useQuery({
    queryKey: ['sales-reportes', filtros],
    queryFn:  () =>
      api.get<SalesReportes>('/api/v1/sales/ventas/reportes/', { params: filtros })
         .then((r) => r.data),
    staleTime: 60_000,
  })
}
