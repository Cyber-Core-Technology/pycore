import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { colaboradoresApi } from '@/api/rrhh-api'
import type { ColaboradorFiltros, ColaboradorFormData } from '@/types/rrhh.types'

export function useColaboradores(filtros?: ColaboradorFiltros) {
  return useQuery({
    queryKey: ['colaboradores', filtros],
    queryFn: () => colaboradoresApi.listar(filtros),
  })
}

export function useColaboradorDetalle(id: string | null) {
  return useQuery({
    queryKey: ['colaborador', id],
    queryFn: () => colaboradoresApi.detalle(id!),
    enabled: !!id,
  })
}

export function useCrearColaborador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ColaboradorFormData) => colaboradoresApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colaboradores'] })
    },
  })
}

export function useActualizarColaborador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ColaboradorFormData> }) =>
      colaboradoresApi.actualizar(id, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['colaboradores'] })
      qc.invalidateQueries({ queryKey: ['colaborador', variables.id] })
    },
  })
}

export function useDarBajaColaborador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fecha_baja }: { id: string; fecha_baja?: string }) =>
      colaboradoresApi.darBaja(id, fecha_baja),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colaboradores'] })
    },
  })
}
