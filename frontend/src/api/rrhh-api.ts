import { api } from './axios-config'
import type {
  Colaborador,
  ColaboradorLista,
  ColaboradorFormData,
  ColaboradorFiltros,
  AsistenciaLista,
  AsistenciaFiltros,
  AsistenciaFormData,
  ResumenDia,
} from '@/types/rrhh.types'

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

export const colaboradoresApi = {
  listar: (filtros?: ColaboradorFiltros) =>
    api
      .get<ColaboradorLista[] | Paginated<ColaboradorLista>>('/api/v1/hr/colaboradores/', { params: filtros })
      .then((r) => normalize(r.data)),

  detalle: (id: string) =>
    api.get<Colaborador>(`/api/v1/hr/colaboradores/${id}/`).then((r) => r.data),

  crear: (data: ColaboradorFormData) =>
    api.post<Colaborador>('/api/v1/hr/colaboradores/', data).then((r) => r.data),

  actualizar: (id: string, data: Partial<ColaboradorFormData>) =>
    api.patch<Colaborador>(`/api/v1/hr/colaboradores/${id}/`, data).then((r) => r.data),

  darBaja: (id: string, fecha_baja?: string) =>
    api.post(`/api/v1/hr/colaboradores/${id}/baja/`, { fecha_baja }).then((r) => r.data),
}

export const asistenciasApi = {
  listar: (filtros?: AsistenciaFiltros) =>
    api
      .get<AsistenciaLista[] | Paginated<AsistenciaLista>>('/api/v1/hr/asistencias/', { params: filtros })
      .then((r) => normalize(r.data)),

  registrar: (data: AsistenciaFormData) =>
    api.post<AsistenciaLista>('/api/v1/hr/asistencias/', data).then((r) => r.data),

  resumenDia: (fecha: string) =>
    api.get<ResumenDia>('/api/v1/hr/asistencias/resumen-dia/', { params: { fecha } }).then((r) => r.data),
}
