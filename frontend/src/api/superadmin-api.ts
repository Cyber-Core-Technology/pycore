import { api } from './axios-config'
import type { EmpresaAdmin, RegisterPayload } from '@/types/superadmin.types'

interface Paginated<T> { count: number; results: T[] }

const norm = <T>(d: T[] | Paginated<T>): Paginated<T> =>
  Array.isArray(d) ? { count: d.length, results: d } : d

export const superadminApi = {
  listarEmpresas: () =>
    api.get<EmpresaAdmin[] | Paginated<EmpresaAdmin>>('/api/v1/core/empresas/')
      .then(r => norm(r.data)),

  detalleEmpresa: (id: string) =>
    api.get<EmpresaAdmin>(`/api/v1/core/empresas/${id}/`).then(r => r.data),

  actualizarEmpresa: (id: string, data: Partial<EmpresaAdmin>) =>
    api.patch<EmpresaAdmin>(`/api/v1/core/empresas/${id}/`, data).then(r => r.data),

  crearEmpresa: (payload: RegisterPayload) =>
    api.post<{ usuario: { empresa: { id_empresa: string; nombre: string } } }>(
      '/api/v1/auth/register/', payload
    ).then(r => r.data),
}
