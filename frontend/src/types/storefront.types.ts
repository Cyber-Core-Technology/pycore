export type VisibilidadPublica = 'privado' | 'publico_sin_stock' | 'publico_con_stock'

export interface StorefrontConfig {
  id: string
  slug: string
  nombre_tienda: string
  descripcion: string
  banner_url: string
  color_primario: string
  color_secundario: string
  activo: boolean
  mostrar_precios: boolean
  mostrar_stock: boolean
  mostrar_agotados: boolean
  pagina_detalle_activa: boolean
  whatsapp: string
  email_pub: string
  sitio_web: string
  meta_titulo: string
  meta_descripcion: string
  // Panel ERP — credenciales MP del negocio
  mp_access_token?: string
  mp_mode?: 'sandbox' | 'production'
  // Campo público derivado (solo lectura desde el storefront)
  acepta_mp?: boolean
  updated_at: string
}

export interface ProductoPublico {
  id: string
  nombre: string
  descripcion: string
  tipo: string
  imagen_url: string
  sku?: string
  codigo_barras?: string
  categoria_nombre: string
  unidad_medida_nombre: string
  visibilidad_publica: VisibilidadPublica
  precio_venta: string | null   // null cuando mostrar_precios=false
  stock_disponible: number | null  // null cuando no aplica mostrar_stock
  slug?: string
}

export interface FichaTecnicaItem {
  clave: string
  valor: string
}

export interface ProductoDetalle extends ProductoPublico {
  slug: string
  descripcion_larga: string
  galeria_imagenes: string[]
  ficha_tecnica: FichaTecnicaItem[]
  relacionados: ProductoPublico[]
}

export interface ProductoVisibilidadUpdate {
  id: string
  visibilidad_publica: VisibilidadPublica
}

export type EstadoPedidoGestion =
  | 'pendiente' | 'apartado' | 'pagado'
  | 'en_proceso' | 'listo' | 'entregado' | 'cancelado'

export interface DetallePedidoGestion {
  id: string
  producto_id: string
  nombre_snapshot: string
  precio_snapshot: string
  cantidad: number
  subtotal: string
}

export interface PedidoGestion {
  id: string
  numero_pedido: string
  ticket_uuid: string
  estado: EstadoPedidoGestion
  metodo_pago: 'efectivo_en_tienda' | 'mercado_pago'
  subtotal: string
  total: string
  notas_cliente: string
  mp_checkout_url: string
  mp_payment_id: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  detalles: DetallePedidoGestion[]
  created_at: string
  updated_at: string
}

export interface ClienteStorefrontERP {
  id:               string
  email:            string
  nombre:           string
  telefono:         string
  activo:           boolean
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
  email_verificado: boolean
  acepto_privacidad: boolean
  created_at:       string
  num_pedidos:      number
}
