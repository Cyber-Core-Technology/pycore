export type PlanEmpresa = 'basico' | 'profesional' | 'empresarial' | 'elite'
export type TipoNegocio = 'informal' | 'formal_simplificado' | 'formal_completo'

export interface EmpresaAdmin {
  id_empresa: string
  nombre: string
  nombre_comercial: string
  slug: string
  rfc: string
  razon_social: string
  tipo_negocio: TipoNegocio
  plan: PlanEmpresa
  email: string
  telefono: string
  direccion: string
  activo: boolean
  fecha_registro: string
}

export interface WizardStep1 {
  nombre: string
  nombre_comercial: string
  rfc: string
  tipo_negocio: TipoNegocio
  plan: PlanEmpresa
  email: string
  telefono: string
}

export interface WizardStep2 {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  email: string
  username: string
  telefono: string
  password: string
  password_confirm: string
}

export interface RegisterPayload {
  nombre_empresa: string
  rfc?: string
  tipo_negocio?: TipoNegocio
  email: string
  username: string
  nombre: string
  apellido_paterno?: string
  apellido_materno?: string
  telefono?: string
  password: string
  password_confirm: string
}
