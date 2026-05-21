import { api } from './axios-config'
import type { Proveedor, ProveedorLista, ProveedorFormData, ProveedorFiltros } from '@/types/proveedores.types'

interface Paginated<T> { count: number; results: T[]; next: string | null; previous: string | null }

const normalize = <T>(data: T[] | Paginated<T>): Paginated<T> =>
  Array.isArray(data)
    ? { count: data.length, results: data, next: null, previous: null }
    : data

export const proveedoresApi = {
  listar: (filtros?: ProveedorFiltros) =>
    api.get<ProveedorLista[] | Paginated<ProveedorLista>>('/api/v1/terceros/proveedores/', { params: filtros })
      .then((r) => normalize(r.data)),

  detalle: (id: string) =>
    api.get<Proveedor>(`/api/v1/terceros/proveedores/${id}/`).then((r) => r.data),

  crear: (data: ProveedorFormData) =>
    api.post<Proveedor>('/api/v1/terceros/proveedores/', data).then((r) => r.data),

  actualizar: (id: string, data: Partial<ProveedorFormData>) =>
    api.patch<Proveedor>(`/api/v1/terceros/proveedores/${id}/`, data).then((r) => r.data),

  eliminar: (id: string) =>
    api.delete(`/api/v1/terceros/proveedores/${id}/`),
}
