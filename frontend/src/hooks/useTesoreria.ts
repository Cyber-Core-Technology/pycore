import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tesoreriaApi } from '@/api/finanzas-api'
import type { CuentaBancariaFormData } from '@/types/finanzas.types'

export function useCuentasBancarias() {
  return useQuery({
    queryKey: ['cuentas-bancarias'],
    queryFn: () => tesoreriaApi.listar(),
    staleTime: 30_000,
  })
}

export function useCuentaBancariaDetalle(id: number | null) {
  return useQuery({
    queryKey: ['cuenta-bancaria', id],
    queryFn: () => tesoreriaApi.detalle(id!),
    enabled: id !== null,
  })
}

export function useCrearCuentaBancaria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CuentaBancariaFormData) => tesoreriaApi.crear(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas-bancarias'] }),
  })
}

export function useActualizarCuentaBancaria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CuentaBancariaFormData> }) =>
      tesoreriaApi.actualizar(id, data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['cuentas-bancarias'] })
      qc.invalidateQueries({ queryKey: ['cuenta-bancaria', vars.id] })
    },
  })
}
