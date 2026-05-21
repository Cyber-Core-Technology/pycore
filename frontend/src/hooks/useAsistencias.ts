import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { asistenciasApi } from '@/api/rrhh-api'
import type { AsistenciaFiltros, AsistenciaFormData } from '@/types/rrhh.types'

export function useAsistencias(filtros?: AsistenciaFiltros) {
  return useQuery({
    queryKey: ['asistencias', filtros],
    queryFn: () => asistenciasApi.listar(filtros),
  })
}

export function useRegistrarAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AsistenciaFormData) => asistenciasApi.registrar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asistencias'] })
      qc.invalidateQueries({ queryKey: ['resumen-dia'] })
    },
  })
}

export function useResumenDia(fecha: string) {
  return useQuery({
    queryKey: ['resumen-dia', fecha],
    queryFn: () => asistenciasApi.resumenDia(fecha),
    enabled: !!fecha,
  })
}
