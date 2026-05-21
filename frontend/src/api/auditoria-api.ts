import { api } from './axios-config'
import type { AuditoriaFiltros, AuditoriaPage } from '@/types/audit.types'

export const auditoriaApi = {
  listar: (filtros?: AuditoriaFiltros) =>
    api
      .get<AuditoriaPage>('/api/v1/audit/logs/', { params: filtros })
      .then((r) => r.data),
}
