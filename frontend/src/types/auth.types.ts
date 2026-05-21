export interface Empresa {
  id: string
  nombre: string
  slug: string
  plan: string
  theme_key?: string
  // Datos perfil/fiscal opcionales del backend
  rfc?: string
  razon_social?: string
  telefono?: string
  email?: string
  direccion?: string
  logo_url?: string
  tipo_negocio?: 'informal' | 'formal_simplificado' | 'formal_completo'
}

export interface Sucursal {
  id_sucursal: string
  nombre: string
  codigo: string
  es_principal: boolean
  es_predeterminada?: boolean
}

export interface Usuario {
  id: string
  email: string
  username: string
  nombre_completo: string
  foto_url: string
  is_staff: boolean
  roles: string[]
  empresa: Empresa | null
  sucursales: Sucursal[]
}

export interface LoginCredentials {
  email: string
  password: string
  trust_token?: string
}

export interface LoginResponse {
  access: string
  refresh: string
  usuario: Usuario
  trust_token?: string
}

export interface TokenRefreshResponse {
  access: string
}
