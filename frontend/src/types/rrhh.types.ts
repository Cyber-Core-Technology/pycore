export type TipoContrato = 'planta' | 'temporal' | 'honorarios' | 'practicante'
export type EstadoColaborador = 'activo' | 'baja' | 'vacaciones' | 'incapacidad'
export type TipoAsistencia = 'entrada' | 'salida' | 'entrada_descanso' | 'salida_descanso'
export type EstadoAsistencia = 'puntual' | 'retardo' | 'falta' | 'justificado'

export interface Colaborador {
  id: string
  numero_empleado: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  nombre_completo: string
  fecha_nacimiento: string
  curp: string
  rfc: string
  nss: string
  email: string
  telefono: string
  puesto: string
  departamento: string
  fecha_ingreso: string
  fecha_baja: string | null
  tipo_contrato: TipoContrato
  salario_diario: string
  estado: EstadoColaborador
  sucursal: string | null
  usuario_id: string | null
  usuario_username: string | null
  usuario_email: string | null
  created_at: string
}

export interface ColaboradorLista {
  id: string
  numero_empleado: string
  nombre_completo: string
  puesto: string
  departamento: string
  estado: EstadoColaborador
  sucursal: string | null
  tiene_usuario: boolean
}

export interface ColaboradorFiltros {
  estado?: EstadoColaborador
  departamento?: string
  q?: string
}

export interface ColaboradorFormData {
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  fecha_nacimiento?: string
  curp?: string
  rfc?: string
  nss?: string
  email?: string
  telefono?: string
  puesto: string
  departamento?: string
  fecha_ingreso: string
  tipo_contrato?: TipoContrato
  salario_diario?: number
  estado?: EstadoColaborador
  usuario?: string | null
}

export interface AsistenciaLista {
  id: string
  colaborador_nombre: string
  colaborador_numero: string
  fecha: string
  hora_registro: string
  tipo: TipoAsistencia
  estado: EstadoAsistencia
}

export interface AsistenciaFiltros {
  colaborador?: string
  fecha?: string
  fecha_desde?: string
  fecha_hasta?: string
  estado?: EstadoAsistencia
  tipo?: TipoAsistencia
}

export interface AsistenciaFormData {
  colaborador: string
  fecha: string
  hora_registro: string
  tipo: TipoAsistencia
  estado?: EstadoAsistencia
  notas?: string
}

export interface ResumenDia {
  puntual: number
  retardo: number
  falta: number
  justificado: number
  total: number
}
