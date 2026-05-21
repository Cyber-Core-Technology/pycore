export interface ClienteStorefront {
  id:        string
  email:     string
  nombre:    string
  telefono:  string
  rfc:              string
  razon_social:     string
  tipo_persona:     string
  regimen_fiscal:   string
  calle:            string
  numero_exterior:  string
  numero_interior:  string
  colonia:          string
  codigo_postal:    string
  ciudad:           string
  estado:           string
  pais:             string
  created_at: string
}

export interface ClientePerfilUpdate {
  nombre?:          string
  telefono?:        string
  rfc?:             string
  razon_social?:    string
  tipo_persona?:    string
  regimen_fiscal?:  string
  calle?:           string
  numero_exterior?: string
  numero_interior?: string
  colonia?:         string
  codigo_postal?:   string
  ciudad?:          string
  estado?:          string
  pais?:            string
}

export interface CartItem {
  id:          string
  nombre:      string
  precio_venta: string   // string decimal del backend
  imagen_url:  string
  cantidad:    number
}

export type MetodoPago = 'efectivo_en_tienda' | 'mercado_pago'

export type EstadoPedido =
  | 'pendiente'
  | 'apartado'
  | 'pagado'
  | 'en_proceso'
  | 'listo'
  | 'entregado'
  | 'cancelado'

export interface DetallePedido {
  id:              string
  producto_id:     string
  nombre_snapshot: string
  precio_snapshot: string
  cantidad:        number
  subtotal:        string
}

export interface Pedido {
  id:                   string
  numero_pedido:        string
  ticket_uuid:          string
  estado:               EstadoPedido
  metodo_pago:          MetodoPago
  subtotal:             string
  total:                string
  notas_cliente:        string
  mp_checkout_url: string
  cliente_nombre:       string
  detalles:             DetallePedido[]
  created_at:           string
}
