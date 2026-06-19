import { api } from './axios-config'
import type { Cliente, ClienteLista, ClienteFormData, ClienteFiltros } from '@/types/terceros.types'
import type { ImportFila, ImportPreviewResultado, ImportResultado } from '@/components/common/ImportModal/ImportModal'

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

  // ── Importación masiva ─────────────────────────────────────────────────────
  previsualizarImportacion: (archivo: File): Promise<ImportPreviewResultado> => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return api.post('/api/v1/terceros/clientes/previsualizar-importacion/', fd, {
      headers: { 'Content-Type': undefined as unknown as string },
    }).then((r) => r.data)
  },

  importarDesdeFilas: (filas: ImportFila[], modo: 'atomico' | 'parcial'): Promise<ImportResultado> =>
    api.post('/api/v1/terceros/clientes/importar/', { modo, filas }).then((r) => r.data),

  descargarPlantilla: async (): Promise<void> => {
    const r = await api.get('/api/v1/terceros/clientes/plantilla-importacion/', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plantilla_clientes.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
