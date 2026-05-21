// Tesorería
export type TipoCuenta = 'cheques' | 'ahorro' | 'inversion' | 'caja'
export type Moneda = 'MXN' | 'USD' | 'EUR'

export interface CuentaBancaria {
  id_cuenta: number
  uuid: string
  nombre: string
  banco: string
  numero_cuenta: string
  clabe: string
  tipo_cuenta: TipoCuenta
  moneda: Moneda
  saldo_actual: string
  saldo_inicial: string
  es_principal: boolean
  activo: boolean
  notas: string
  created_at: string
}

export interface CuentaBancariaFormData {
  nombre: string
  banco?: string
  numero_cuenta?: string
  clabe?: string
  tipo_cuenta?: TipoCuenta
  moneda?: Moneda
  saldo_inicial?: number
  es_principal?: boolean
  notas?: string
}

// CxC
export type EstadoCxC = 'pendiente' | 'pagada_parcial' | 'pagada' | 'vencida' | 'cancelada'

export interface CxC {
  id_cxc: number
  uuid: string
  folio: string
  cliente: number
  nombre_cliente: string
  venta: number | null
  folio_venta: string | null
  monto_original: string
  saldo_pendiente: string
  fecha_emision: string
  fecha_vencimiento: string
  estado: EstadoCxC
  esta_vencida: boolean
  notas: string
  created_at: string
}

export interface CxCFiltros {
  estado?: EstadoCxC
  vencidas?: boolean
  fecha_desde?: string
  fecha_hasta?: string
}

// CxP
export type EstadoCxP = 'pendiente' | 'pagada_parcial' | 'pagada' | 'vencida' | 'cancelada'

export interface CxP {
  id_cxp: number
  uuid: string
  folio: string
  proveedor: number
  nombre_proveedor: string
  compra: number | null
  folio_compra: string | null
  monto_original: string
  saldo_pendiente: string
  fecha_emision: string
  fecha_vencimiento: string
  estado: EstadoCxP
  esta_vencida: boolean
  notas: string
  created_at: string
}

export interface CxPFiltros {
  estado?: EstadoCxP
  vencidas?: boolean
  fecha_desde?: string
  fecha_hasta?: string
}

// Gastos
export type CategoriaGasto =
  | 'renta'
  | 'servicios'
  | 'nomina'
  | 'mantenimiento'
  | 'marketing'
  | 'transporte'
  | 'impuestos'
  | 'otro'

export type MetodoPago =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia'
  | 'cheque'
  | 'otro'

export interface Gasto {
  id_gasto: number
  uuid: string
  folio: string
  sucursal: number | null
  nombre_sucursal: string | null
  cuenta_bancaria: number | null
  nombre_cuenta: string | null
  concepto: string
  categoria: CategoriaGasto
  monto: string
  impuesto_monto: string
  total: string
  metodo_pago: MetodoPago
  fecha_gasto: string
  referencia: string
  comprobante_url: string
  notas: string
  created_at: string
}

export interface GastoFiltros {
  categoria?: CategoriaGasto
  fecha_desde?: string
  fecha_hasta?: string
}

export interface GastoFormData {
  concepto: string
  categoria?: CategoriaGasto
  monto: number
  impuesto_monto?: number
  metodo_pago: MetodoPago
  fecha_gasto?: string
  referencia?: string
  notas?: string
}
