export type EstadoVenta = 'borrador' | 'activo' | 'cancelado' | 'pagado'
export type MetodoPago = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'cheque' | 'credito' | 'otro'

export interface ClienteResumen {
  id:     string
  nombre: string
  rfc?:   string
}

export interface ProductoResumen {
  id:     string
  nombre: string
  sku:    string
}

export interface DetalleVenta {
  id_detalle:               number
  id_producto:              string
  nombre_producto:          string
  sku_producto:             string
  variante:                 string | null
  variante_nombre:          string | null
  unidad_medida_nombre?:    string
  unidad_medida_abreviacion?: string
  cantidad:                 number
  precio_unitario:          number
  descuento:                number
  subtotal:                 number
  impuesto_monto:           number
  total:                    number
  utilidad:                 number
  notas?:                   string
}

export interface Venta {
  id_venta:        number
  uuid:            string
  folio:           string
  estado:          EstadoVenta
  metodo_pago:     MetodoPago
  id_cliente:      string | null
  id_sucursal:     string
  nombre_sucursal: string
  nombre_vendedor: string
  subtotal:        string
  descuento:       string
  impuestos:       string
  total:           string
  saldo_pendiente: string
  monto_recibido?: string | null
  cambio?:         string | null
  notas:           string
  fecha_venta:     string
  id_cxc:          number | null
  created_at:      string
  updated_at:      string
  detalles?:       DetalleVenta[]
}

export interface VentaFiltros {
  estado?:      EstadoVenta
  id_cliente?:  string
  metodo_pago?: MetodoPago
  fecha_desde?: string
  fecha_hasta?: string
  id_sucursal?: string
}

export interface DetalleVentaInput {
  id_producto:     string
  id_variante?:    string | null
  cantidad:        number
  precio_unitario: number
  descuento?:      number
  notas?:          string
}

export interface NuevaVentaInput {
  id_cliente?:      string
  id_sucursal:      string
  metodo_pago:      MetodoPago
  monto_recibido?:  number | null
  items:            DetalleVentaInput[]
  notas?:           string
  requiere_factura?: boolean
}