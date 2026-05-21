import { api } from './axios-config'
import type {
  CuentaBancaria,
  CuentaBancariaFormData,
  CxC,
  CxCFiltros,
  CxP,
  CxPFiltros,
  Gasto,
  GastoFiltros,
  GastoFormData,
} from '@/types/finanzas.types'

interface Paginated<T> {
  count: number
  results: T[]
  next: string | null
  previous: string | null
}

const normalize = <T>(data: T[] | Paginated<T>): Paginated<T> =>
  Array.isArray(data)
    ? { count: data.length, results: data, next: null, previous: null }
    : data

export const tesoreriaApi = {
  listar: () =>
    api
      .get<CuentaBancaria[] | Paginated<CuentaBancaria>>('/api/v1/finance/cuentas-bancarias/')
      .then((r) => normalize(r.data)),

  detalle: (id: number) =>
    api.get<CuentaBancaria>(`/api/v1/finance/cuentas-bancarias/${id}/`).then((r) => r.data),

  crear: (data: CuentaBancariaFormData) =>
    api.post<CuentaBancaria>('/api/v1/finance/cuentas-bancarias/', data).then((r) => r.data),

  actualizar: (id: number, data: Partial<CuentaBancariaFormData>) =>
    api.patch<CuentaBancaria>(`/api/v1/finance/cuentas-bancarias/${id}/`, data).then((r) => r.data),
}

export const cxcApi = {
  listar: (filtros?: CxCFiltros) =>
    api
      .get<CxC[] | Paginated<CxC>>('/api/v1/finance/cxc/', { params: filtros })
      .then((r) => normalize(r.data)),

  detalle: (id: number) =>
    api.get<CxC>(`/api/v1/finance/cxc/${id}/`).then((r) => r.data),

  cancelar: (id: number) =>
    api.post(`/api/v1/finance/cxc/${id}/cancelar/`).then((r) => r.data),

  crearDesdeVenta: (id_venta: number) =>
    api.post<CxC>('/api/v1/finance/cxc/desde-venta/', { id_venta }).then((r) => r.data),
}

export const cxpApi = {
  listar: (filtros?: CxPFiltros) =>
    api
      .get<CxP[] | Paginated<CxP>>('/api/v1/finance/cxp/', { params: filtros })
      .then((r) => normalize(r.data)),

  detalle: (id: number) =>
    api.get<CxP>(`/api/v1/finance/cxp/${id}/`).then((r) => r.data),

  cancelar: (id: number) =>
    api.post(`/api/v1/finance/cxp/${id}/cancelar/`).then((r) => r.data),
}

export const gastosApi = {
  listar: (filtros?: GastoFiltros) =>
    api
      .get<Gasto[] | Paginated<Gasto>>('/api/v1/finance/gastos/', { params: filtros })
      .then((r) => normalize(r.data)),

  detalle: (id: number) =>
    api.get<Gasto>(`/api/v1/finance/gastos/${id}/`).then((r) => r.data),

  crear: (data: GastoFormData) =>
    api.post<Gasto>('/api/v1/finance/gastos/', data).then((r) => r.data),
}
