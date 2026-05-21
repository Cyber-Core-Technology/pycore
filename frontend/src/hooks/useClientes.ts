import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientesApi } from '@/api/terceros-api'
import { storefrontApi } from '@/api/storefront-api'
import type { ClienteFormData, ClienteFiltros } from '@/types/terceros.types'

export function useClientes(filtros?: ClienteFiltros) {
  return useQuery({
    queryKey: ['clientes', filtros],
    queryFn:  () => clientesApi.listar(filtros),
    staleTime: 30_000,
  })
}

export function useClienteDetalle(id: string | null) {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn:  () => clientesApi.detalle(id!),
    enabled:  !!id,
  })
}

export function useClienteStorefrontDetalle(id: string | null) {
  return useQuery({
    queryKey: ['cliente-storefront', id],
    queryFn:  () => storefrontApi.getClienteStorefront(id!),
    enabled:  !!id,
  })
}

export function useCrearCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClienteFormData) => clientesApi.crear(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export function useActualizarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClienteFormData> }) =>
      clientesApi.actualizar(id, data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['cliente', vars.id] })
    },
  })
}

export function useEliminarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clientesApi.eliminar(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}
