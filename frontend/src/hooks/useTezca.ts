import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tezcaApi } from '@/api/tezca-api'

export const TEZCA_KEYS = {
  insights:      ['tezca', 'insights'],
  badge:         ['tezca', 'badge'],
  status:        ['tezca', 'status'],
  conversaciones: ['tezca', 'conversaciones'],
}

export function useTezcaInsights(soloNoLeidos = false) {
  return useQuery({
    queryKey: [...TEZCA_KEYS.insights, soloNoLeidos],
    queryFn:  () => tezcaApi.getInsights(soloNoLeidos),
    staleTime: 60_000,
    retry: false,
  })
}

export function useTezcaBadge() {
  return useQuery({
    queryKey: TEZCA_KEYS.badge,
    queryFn:  tezcaApi.getBadge,
    refetchInterval: (query) => query.state.error ? false : 60_000,
    retry: false,
  })
}

export function useTezcaStatus() {
  return useQuery({
    queryKey: TEZCA_KEYS.status,
    queryFn:  tezcaApi.getStatus,
  })
}

export function useTezcaConversaciones() {
  return useQuery({
    queryKey: TEZCA_KEYS.conversaciones,
    queryFn:  tezcaApi.getConversaciones,
  })
}

export function useMarcarLeido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tezcaApi.marcarLeido(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEZCA_KEYS.insights })
      qc.invalidateQueries({ queryKey: TEZCA_KEYS.badge })
    },
  })
}

export function useTezcaConsultar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pregunta: string) => tezcaApi.consultar(pregunta),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEZCA_KEYS.status })
      qc.invalidateQueries({ queryKey: TEZCA_KEYS.conversaciones })
    },
  })
}
