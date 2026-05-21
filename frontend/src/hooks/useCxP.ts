import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cxpApi } from '@/api/finanzas-api'
import type { CxPFiltros } from '@/types/finanzas.types'

export function useCxP(filtros?: CxPFiltros) {
  return useQuery({
    queryKey: ['cxp', filtros],
    queryFn: () => cxpApi.listar(filtros),
    staleTime: 30_000,
  })
}

export function useCxPDetalle(id: number | null) {
  return useQuery({
    queryKey: ['cxp-detalle', id],
    queryFn: () => cxpApi.detalle(id!),
    enabled: id !== null,
  })
}

export function useCancelarCxP() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cxpApi.cancelar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cxp'] }),
  })
}
