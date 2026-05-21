import { api } from './axios-config'

export interface UsuarioEmpresa {
  id: string
  email: string
  username: string
  nombre_completo: string
  foto_url: string
  roles: string[]
  is_active: boolean
  date_joined: string
  jefe_id: string | null
}

export interface CrearUsuarioPayload {
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  email: string
  username: string
  password: string
  password_confirm: string
  roles: string[]
}

export interface ActualizarRolesPayload {
  nombre?: string
  apellido_paterno?: string
  apellido_materno?: string
  email?: string
  telefono?: string
  roles: string[]
  jefe_id?: string | null
}

export interface SucursalAsignada {
  id_sucursal: string
  nombre: string
  codigo: string
  es_principal: boolean
  es_predeterminada: boolean
}

export const usuariosApi = {
  listar: () =>
    api.get<UsuarioEmpresa[]>('/api/v1/usuarios/').then((r) => r.data),

  crear: (payload: CrearUsuarioPayload) =>
    api.post<UsuarioEmpresa>('/api/v1/usuarios/', payload).then((r) => r.data),

  actualizarRoles: (id: string, payload: ActualizarRolesPayload) =>
    api.patch<UsuarioEmpresa>(`/api/v1/usuarios/${id}/`, payload).then((r) => r.data),

  darBaja: (id: string) =>
    api.delete(`/api/v1/usuarios/${id}/`).then((r) => r.data),

  // ── Sucursales ──────────────────────────────────────────────
  getSucursales: (id: string) =>
    api.get<SucursalAsignada[]>(`/api/v1/usuarios/${id}/sucursales/`).then((r) => r.data),

  setSucursales: (id: string, sucursal_ids: string[]) =>
    api.put<SucursalAsignada[]>(`/api/v1/usuarios/${id}/sucursales/`, { sucursal_ids }).then((r) => r.data),
}
