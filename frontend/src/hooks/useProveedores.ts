import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proveedoresApi } from '@/api/proveedores-api'
import type { ProveedorFormData, ProveedorFiltros } from '@/types/proveedores.types'

export function useProveedores(filtros?: ProveedorFiltros) {
  return useQuery({
    queryKey: ['proveedores', filtros],
    queryFn:  () => proveedoresApi.listar(filtros),
    staleTime: 30_000,
  })
}

export function useProveedorDetalle(id: string | null) {
  return useQuery({
    queryKey: ['proveedor', id],
    queryFn:  () => proveedoresApi.detalle(id!),
    enabled:  !!id,
  })
}

export function useCrearProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProveedorFormData) => proveedoresApi.crear(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}

export function useActualizarProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProveedorFormData> }) =>
      proveedoresApi.actualizar(id, data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['proveedores'] })
      qc.invalidateQueries({ queryKey: ['proveedor', vars.id] })
    },
  })
}

export function useEliminarProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => proveedoresApi.eliminar(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}
