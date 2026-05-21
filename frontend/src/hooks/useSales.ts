import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '@/api/sales-api'
import type { VentaFiltros, NuevaVentaInput } from '@/types/sales.types'

export function useVentas(filtros?: VentaFiltros) {
  return useQuery({
    queryKey: ['ventas', filtros],
    queryFn:  () => salesApi.listar(filtros),
    staleTime: 30_000,
  })
}

export function useVentaDetalle(id: string | null) {
  return useQuery({
    queryKey: ['venta', id],
    queryFn:  () => salesApi.detalle(id!),
    enabled:  !!id,
  })
}

export function useCrearVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevaVentaInput) => salesApi.crear(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['ventas'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['stock-alertas'] })
    },
  })
}

export function useCancelarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      salesApi.cancelar(id, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['stock-alertas'] })
    },
  })
}
