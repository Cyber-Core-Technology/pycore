// ── Enums ─────────────────────────────────────────────────────────────────────

export type TipoProducto      = 'producto' | 'servicio' | 'combo'
export type VisibilidadPublica = 'privado' | 'publico_sin_stock' | 'publico_con_stock'
export type TipoMovimiento    = 'entrada' | 'salida' | 'ajuste' | 'traspaso_salida' | 'traspaso_entrada'
export type TipoReferencia = 'compra' | 'venta' | 'ajuste' | 'traspaso' | 'devolucion' | 'cancelacion_venta' | 'inicial'

// ── Producto ──────────────────────────────────────────────────────────────────

export interface Variante {
  id:                       string
  nombre:                   string
  sku:                      string
  codigo_barras:            string
  atributos:                Record<string, string>
  unidad_medida:            string | null   // UUID
  unidad_medida_nombre:     string | null
  unidad_medida_abreviatura: string | null
  es_por_peso:              boolean
  precio_venta:             string | null
  precio_compra:            string | null
  precio_venta_efectivo:    string
  precio_compra_efectivo:   string
  activo:                   boolean
}

export interface ProductoLight {
  id:                       string   // UUID
  codigo:                   string
  sku:                      string
  nombre:                   string
  tipo:                     TipoProducto
  categoria_nombre:         string | null
  unidad_medida_nombre:     string | null
  unidad_medida_abreviacion: string | null
  precio_venta:             string
  precio_compra:            string
  maneja_inventario:        boolean
  stock_minimo:             string
  tiene_variantes:          boolean
  es_por_peso:              boolean
  activo:                   boolean
  imagen_url:               string
  visibilidad_publica:      VisibilidadPublica
}

export interface FichaTecnicaItem {
  clave: string
  valor: string
}

export interface Producto extends ProductoLight {
  codigo_barras:        string
  descripcion:          string
  categoria:            string | null
  unidad_medida:        string | null
  impuesto:             string | null
  impuesto_nombre:      string | null
  impuesto_tasa:        string | null
  precio_mayoreo:       string
  stock_maximo:         string
  tiene_variantes:      boolean
  imagen_url:           string
  notas:                string
  // Campos para página de detalle en tienda
  slug:                 string
  descripcion_larga:    string
  galeria_imagenes:     string[]
  ficha_tecnica:        FichaTecnicaItem[]
  variantes:            Variante[]
  created_at:           string
}

// ── Inventario (stock) ────────────────────────────────────────────────────────

export interface StockItem {
  id:                 string   // UUID
  producto:           string   // UUID
  producto_nombre:    string
  producto_sku:       string
  variante:           string | null
  variante_nombre:    string | null
  sucursal:           string   // UUID
  sucursal_nombre:    string
  stock_actual:       string
  stock_reservado:    string
  stock_disponible:   string   // calculado
  costo_promedio:     string
  valor_inventario:   string   // calculado
  ubicacion:          string
  pasillo:            string
  estante:            string
  bajo_minimo:        boolean  // calculado
  es_por_peso:        boolean
  unidad_abreviatura: string | null
  updated_at:         string
}

// ── Movimiento ────────────────────────────────────────────────────────────────

export interface Movimiento {
  id:               string   // UUID
  folio:            string
  tipo_movimiento:  TipoMovimiento
  producto:         string   // UUID
  producto_nombre:  string
  variante:         string | null
  sucursal:         string   // UUID
  sucursal_nombre:  string
  cantidad:         string
  costo_unitario:   string
  costo_total:      string
  stock_antes:      string
  stock_despues:    string
  tipo_referencia:  TipoReferencia | ''
  referencia_id:    string
  motivo:           string
  observaciones:    string
  created_at:       string
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface AjusteRequest {
  producto_id:    string   // UUID
  sucursal_id:    string   // UUID
  variante_id?:   string | null
  cantidad_nueva: string
  motivo:         string
}

export interface EntradaRequest {
  producto_id:    string   // UUID
  sucursal_id:    string   // UUID
  variante_id?:   string | null
  cantidad:       string
  costo_unitario: string
  motivo:         string
}

// ── Filtros ───────────────────────────────────────────────────────────────────

export interface FiltrosProducto {
  q?:      string
  activo?: boolean
  tipo?:   TipoProducto
}

export interface FiltrosMovimiento {
  producto_id?:    string
  tipo_movimiento?: TipoMovimiento
  sucursal_id?:    string
}

// ── Barcode Lookup ────────────────────────────────────────────────────────────

export type BarcodeOrigen = 'interno' | 'externo' | 'no_encontrado'

export interface BarcodeLookupResult {
  origen:      BarcodeOrigen
  encontrado:  boolean
  producto: {
    id_producto:      number | null
    uuid:             string | null
    id_variante:      number | null
    nombre:           string
    descripcion:      string
    sku:              string | null
    codigo_barras:    string
    precio_venta:     number | null
    precio_compra:    number | null
    precio_mayoreo:   number | null
    imagen_url:       string | null
    stock_disponible: number | null
    unidad_medida:    string | null
    categoria:        string | null
    activo:           boolean
    es_vendible:      boolean
    meta: {
      fuente:      string
      marca:       string
      pais_origen?: string
      cantidad?:   string
      modelo?:     string
    } | null
  }
}
