import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superadminApi } from '@/api/superadmin-api'
import type { EmpresaAdmin, RegisterPayload } from '@/types/superadmin.types'

export function useEmpresas() {
  return useQuery({
    queryKey: ['admin-empresas'],
    queryFn: () => superadminApi.listarEmpresas(),
    staleTime: 30_000,
  })
}

export function useEmpresaDetalle(id: string | null) {
  return useQuery({
    queryKey: ['admin-empresa', id],
    queryFn: () => superadminApi.detalleEmpresa(id!),
    enabled: !!id,
  })
}

export function useCrearEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RegisterPayload) => superadminApi.crearEmpresa(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-empresas'] }),
  })
}

export function useActualizarEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmpresaAdmin> }) =>
      superadminApi.actualizarEmpresa(id, data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-empresas'] })
      qc.invalidateQueries({ queryKey: ['admin-empresa', vars.id] })
    },
  })
}
