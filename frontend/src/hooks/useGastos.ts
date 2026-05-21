import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gastosApi } from '@/api/finanzas-api'
import type { GastoFiltros, GastoFormData } from '@/types/finanzas.types'

export function useGastos(filtros?: GastoFiltros) {
  return useQuery({
    queryKey: ['gastos', filtros],
    queryFn: () => gastosApi.listar(filtros),
    staleTime: 30_000,
  })
}

export function useGastoDetalle(id: number | null) {
  return useQuery({
    queryKey: ['gasto-detalle', id],
    queryFn: () => gastosApi.detalle(id!),
    enabled: id !== null,
  })
}

export function useRegistrarGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GastoFormData) => gastosApi.crear(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gastos'] }),
  })
}
