import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cxcApi } from '@/api/finanzas-api'
import type { CxCFiltros } from '@/types/finanzas.types'

export function useCxC(filtros?: CxCFiltros) {
  return useQuery({
    queryKey: ['cxc', filtros],
    queryFn: () => cxcApi.listar(filtros),
    staleTime: 30_000,
  })
}

export function useCxCDetalle(id: number | null) {
  return useQuery({
    queryKey: ['cxc-detalle', id],
    queryFn: () => cxcApi.detalle(id!),
    enabled: id !== null,
  })
}

export function useCancelarCxC() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cxcApi.cancelar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cxc'] }),
  })
}

export function useCrearCxCDesdeVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id_venta: number) => cxcApi.crearDesdeVenta(id_venta),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cxc'] })
      qc.invalidateQueries({ queryKey: ['ventas'] })
    },
  })
}
