// frontend/src/hooks/useStorefront.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storefrontApi } from '@/api/storefront-api'
import type { StorefrontConfig, ProductoVisibilidadUpdate } from '@/types/storefront.types'

export function useStorefront() {
  const qc = useQueryClient()

  const configQuery = useQuery({
    queryKey: ['storefront-config'],
    queryFn:  storefrontApi.obtenerConfig,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StorefrontConfig>) => storefrontApi.actualizarConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storefront-config'] }),
  })

  const bulkVisibilidadMutation = useMutation({
    mutationFn: (updates: ProductoVisibilidadUpdate[]) => storefrontApi.bulkVisibilidad(updates),
  })

  return { configQuery, updateMutation, bulkVisibilidadMutation }
}
