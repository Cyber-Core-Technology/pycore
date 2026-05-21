// ── Enums ─────────────────────────────────────────────────────────────────────

export type EstadoCompra =
  | 'borrador'
  | 'activo'
  | 'recibida_parcial'
  | 'recibida'
  | 'cancelada'

export type MetodoPagoCompra =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia'
  | 'cheque'
  | 'otro'

// ── Respuestas del API ────────────────────────────────────────────────────────

export interface DetalleCompra {
  id_detalle:                   number       // AutoField
  id_producto:                  string       // UUID
  nombre_producto:              string
  sku_producto:                 string
  id_variante:                  string | null
  cantidad:                     string       // Decimal viene como string
  cantidad_recibida:            string
  cantidad_pendiente:           string
  esta_completamente_recibida:  boolean
  precio_unitario:              string
  descuento:                    string
  subtotal:                     string
  impuesto_tasa:                string
  impuesto_monto:               string
  total:                        string
}

export interface CompraLight {
  id_compra:       number       // AutoField — se usa en la URL
  folio:           string
  nombre_proveedor: string
  nombre_sucursal:  string
  fecha_compra:    string
  fecha_entrega:   string | null
  estado:          EstadoCompra
  total:           string
  saldo_pendiente: string
  metodo_pago:     MetodoPagoCompra | null
}

export interface Compra extends CompraLight {
  uuid:            string
  id_proveedor:    string       // UUID
  id_sucursal:     string       // UUID
  subtotal:        string
  descuento:       string
  impuestos:       string
  fecha_vencimiento: string | null
  numero_factura:  string
  orden_compra:    string
  notas:           string
  detalles:        DetalleCompra[]
  created_at:      string
  updated_at:      string
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface ItemCompraRequest {
  id_producto:     string       // UUID
  id_variante?:    string | null
  cantidad:        string
  precio_unitario: string
  descuento?:      string
  impuesto_tasa?:  string | null
}

export interface CrearCompraRequest {
  id_proveedor:     string      // UUID
  id_sucursal:      string      // UUID
  fecha_entrega?:   string | null
  fecha_vencimiento?: string | null
  metodo_pago?:     MetodoPagoCompra | null
  numero_factura?:  string
  orden_compra?:    string
  notas?:           string
  items:            ItemCompraRequest[]
}

export interface ActualizarCompraRequest {
  fecha_entrega?:    string | null
  fecha_vencimiento?: string | null
  metodo_pago?:      MetodoPagoCompra | null
  numero_factura?:   string
  orden_compra?:     string
  notas?:            string
  items?:            ItemCompraRequest[]
}

export interface ItemRecepcionRequest {
  id_detalle:        number     // AutoField (Integer)
  cantidad_recibida: string
}

export interface RecibirMercanciaRequest {
  items: ItemRecepcionRequest[]
}

// ── Filtros ───────────────────────────────────────────────────────────────────

export interface FiltrosCompra {
  estado?:       EstadoCompra
  metodo_pago?:  MetodoPagoCompra
  id_proveedor?: string
  id_sucursal?:  string
  fecha_desde?:  string
  fecha_hasta?:  string
}
