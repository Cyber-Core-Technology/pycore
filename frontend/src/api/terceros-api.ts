import { api } from './axios-config'
import type { Cliente, ClienteLista, ClienteFormData, ClienteFiltros } from '@/types/terceros.types'

interface Paginated<T> { count: number; results: T[]; next: string | null; previous: string | null }

const normalize = <T>(data: T[] | Paginated<T>): Paginated<T> =>
  Array.isArray(data)
    ? { count: data.length, results: data, next: null, previous: null }
    : data

export const clientesApi = {
  listar: (filtros?: ClienteFiltros) =>
    api.get<ClienteLista[] | Paginated<ClienteLista>>('/api/v1/terceros/clientes/', { params: filtros })
      .then((r) => normalize(r.data)),

  detalle: (id: string) =>
    api.get<Cliente>(`/api/v1/terceros/clientes/${id}/`).then((r) => r.data),

  crear: (data: ClienteFormData) =>
    api.post<Cliente>('/api/v1/terceros/clientes/', data).then((r) => r.data),

  actualizar: (id: string, data: Partial<ClienteFormData>) =>
    api.patch<Cliente>(`/api/v1/terceros/clientes/${id}/`, data).then((r) => r.data),

  eliminar: (id: string) =>
    api.delete(`/api/v1/terceros/clientes/${id}/`),
}
