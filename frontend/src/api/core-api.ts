import { api } from './axios-config'

export interface Configuracion {
  moneda: string
  decimales: number
  genera_cfdi: boolean
  serie_factura: string
  folio_actual: number
  maneja_inventario: boolean
  alerta_stock_minimo: boolean
  email_notificaciones: string
}

export interface EmpresaDetalle {
  id_empresa: string
  nombre: string
  nombre_comercial: string
  slug: string
  rfc: string
  razon_social: string
  regimen_fiscal: string
  tipo_negocio: 'informal' | 'formal_simplificado' | 'formal_completo'
  plan: string
  email: string
  telefono: string
  direccion: string
  logo: string | null
  activo: boolean
  configuracion: Configuracion | null
}

export interface Sucursal {
  id_sucursal: string
  nombre: string
  codigo: string
  direccion: string
  ciudad: string
  estado: string
  cp: string
  telefono: string
  email: string
  es_principal: boolean
  activo: boolean
  fecha_registro: string
}

export interface SucursalPayload {
  nombre: string
  codigo: string
  direccion?: string
  ciudad?: string
  estado?: string
  cp?: string
  telefono?: string
  email?: string
  es_principal?: boolean
}

export const coreApi = {
  tema: {
    obtener:    () =>
      api.get<{ theme_key: string }>('/api/v1/core/tema/').then(r => r.data),
    actualizar: (theme_key: string) =>
      api.put<{ theme_key: string }>('/api/v1/core/tema/', { theme_key }).then(r => r.data),
  },
  empresa: {
    obtener:          (id: string)                                => api.get<EmpresaDetalle>(`/api/v1/core/empresas/${id}/`).then(r => r.data),
    actualizar:       (id: string, data: Partial<EmpresaDetalle>) => api.patch<EmpresaDetalle>(`/api/v1/core/empresas/${id}/`, data).then(r => r.data),
    actualizarConfig: (id: string, data: Partial<Configuracion>)  => api.patch<Configuracion>(`/api/v1/core/empresas/${id}/configuracion/`, data).then(r => r.data),
  },
  sucursales: {
    listar:     ()                                           => api.get<Sucursal[]>('/api/v1/core/sucursales/').then(r => r.data),
    crear:      (data: SucursalPayload)                      => api.post<Sucursal>('/api/v1/core/sucursales/', data).then(r => r.data),
    actualizar: (id: string, data: Partial<SucursalPayload>) => api.patch<Sucursal>(`/api/v1/core/sucursales/${id}/`, data).then(r => r.data),
    eliminar:   (id: string)                                 => api.delete(`/api/v1/core/sucursales/${id}/`),
  },
}
