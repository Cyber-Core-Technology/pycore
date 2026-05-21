import { api } from './axios-config'

export interface Categoria {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  padre?: string | null
  padre_nombre?: string
  ruta_completa?: string
  subcategorias_count: number
  activo: boolean
  created_at: string
}

export interface Impuesto {
  id: string
  codigo: string
  nombre: string
  tasa: string
  tipo: 'IVA' | 'IEPS' | 'ISR' | 'otro'
  es_retencion: boolean
  activo: boolean
  created_at: string
}

export interface UnidadMedida {
  id: string
  codigo: string
  nombre: string
  abreviatura: string
  tipo: 'pieza' | 'peso' | 'volumen' | 'longitud' | 'tiempo' | 'area' | 'otro'
  activo: boolean
  created_at: string
}

export const catalogsApi = {
  categorias: {
    listar:     (todos = false)                 => api.get<Categoria[]>('/api/v1/catalogs/categorias/', { params: todos ? { todos: '1' } : {} }).then(r => r.data),
    crear:      (data: Partial<Categoria>)      => api.post<Categoria>('/api/v1/catalogs/categorias/', data).then(r => r.data),
    actualizar: (id: string, data: Partial<Categoria>) => api.patch<Categoria>(`/api/v1/catalogs/categorias/${id}/`, data).then(r => r.data),
    eliminar:   (id: string)                    => api.delete(`/api/v1/catalogs/categorias/${id}/`),
  },
  impuestos: {
    listar:     (todos = false)                 => api.get<Impuesto[]>('/api/v1/catalogs/impuestos/', { params: todos ? { todos: '1' } : {} }).then(r => r.data),
    crear:      (data: Partial<Impuesto>)       => api.post<Impuesto>('/api/v1/catalogs/impuestos/', data).then(r => r.data),
    actualizar: (id: string, data: Partial<Impuesto>) => api.patch<Impuesto>(`/api/v1/catalogs/impuestos/${id}/`, data).then(r => r.data),
    eliminar:   (id: string)                    => api.delete(`/api/v1/catalogs/impuestos/${id}/`),
  },
  unidades: {
    listar:     (todos = false)                 => api.get<UnidadMedida[]>('/api/v1/catalogs/unidades-medida/', { params: todos ? { todos: '1' } : {} }).then(r => r.data),
    crear:      (data: Partial<UnidadMedida>)   => api.post<UnidadMedida>('/api/v1/catalogs/unidades-medida/', data).then(r => r.data),
    actualizar: (id: string, data: Partial<UnidadMedida>) => api.patch<UnidadMedida>(`/api/v1/catalogs/unidades-medida/${id}/`, data).then(r => r.data),
    eliminar:   (id: string)                    => api.delete(`/api/v1/catalogs/unidades-medida/${id}/`),
  },
}
