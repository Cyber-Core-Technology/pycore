import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasesApi } from '@/api/purchases-api'
import type {
  FiltrosCompra,
  CrearCompraRequest,
  ActualizarCompraRequest,
  RecibirMercanciaRequest,
} from '@/types/purchases.types'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCompras(filtros: FiltrosCompra = {}) {
  return useQuery({
    queryKey: ['compras', filtros],
    queryFn:  () => purchasesApi.listar(filtros),
  })
}

export function useCompra(idCompra: number | null) {
  return useQuery({
    queryKey: ['compra', idCompra],
    queryFn:  () => purchasesApi.obtener(idCompra!),
    enabled:  idCompra !== null,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCrearCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CrearCompraRequest) => purchasesApi.crear(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['compras'] }),
  })
}

export function useActualizarCompra(idCompra: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ActualizarCompraRequest) => purchasesApi.actualizar(idCompra, data),
    onSuccess:  (compra) => {
      qc.invalidateQueries({ queryKey: ['compras'] })
      qc.setQueryData(['compra', idCompra], compra)
    },
  })
}

export function useConfirmarCompra(idCompra: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => purchasesApi.confirmar(idCompra),
    onSuccess:  (compra) => {
      qc.invalidateQueries({ queryKey: ['compras'] })
      qc.setQueryData(['compra', idCompra], compra)
    },
  })
}

export function useCancelarCompra(idCompra: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (motivo: string) => purchasesApi.cancelar(idCompra, motivo),
    onSuccess:  (compra) => {
      qc.invalidateQueries({ queryKey: ['compras'] })
      qc.setQueryData(['compra', idCompra], compra)
    },
  })
}

export function useRecibirMercancia(idCompra: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RecibirMercanciaRequest) => purchasesApi.recibirMercancia(idCompra, data),
    onSuccess:  (compra) => {
      qc.invalidateQueries({ queryKey: ['compras'] })
      qc.setQueryData(['compra', idCompra], compra)
    },
  })
}
