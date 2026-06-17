import { api } from './axios-config'
import type { Venta, NuevaVentaInput, VentaFiltros } from '@/types/sales.types'

export const salesApi = {
  listar: (filtros?: VentaFiltros) =>
    api.get<Venta[]>('/api/v1/sales/ventas/', { params: filtros }).then((r) =>
      Array.isArray(r.data)
        ? { count: r.data.length, results: r.data, next: null, previous: null }
        : r.data
    ),

  detalle: (id: string) =>
    api.get<Venta>(`/api/v1/sales/ventas/${id}/`).then((r) => r.data),

  crear: (data: NuevaVentaInput) =>
    api.post<Venta>('/api/v1/sales/ventas/', data).then((r) => r.data),

  cancelar: (id: string, motivo: string) =>
    api.post<Venta>(`/api/v1/sales/ventas/${id}/cancelar/`, { motivo }).then((r) => r.data),

  enviarTicket: (id: string | number, email: string) =>
    api
      .post<{ enviado: boolean; email: string }>(
        `/api/v1/sales/ventas/${id}/enviar-ticket/`,
        { email },
      )
      .then((r) => r.data),
}