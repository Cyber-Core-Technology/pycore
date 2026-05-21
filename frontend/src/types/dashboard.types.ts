export interface KpiData {
  ventas_hoy:          number
  ventas_ayer:         number
  transacciones_hoy:   number
  ticket_promedio:     number
  ventas_mes:          number
  ventas_mes_anterior: number
  utilidad_hoy:        number
  stock_bajo:          number
  cxc_pendiente:       number
  cxc_vencidas:        number
  compras_mes:         number
}

export interface VentaDia {
  fecha:    string
  total:    number
  utilidad: number
}

export interface TopProducto {
  nombre:   string
  sku:      string
  unidades: number
  ingreso:  number
}

export interface TopCliente {
  nombre:      string
  num_compras: number
  total:       number
}

export interface MetodoPagoItem {
  metodo: string
  label:  string
  total:  number
  count:  number
  pct:    number
}

export interface AlertaStock {
  producto: string
  sku:      string
  stock:    number
  minimo:   number
}

export interface CxcItem {
  cliente: string
  folio:   string
  vence:   string
  monto:   number
  estado:  'pendiente' | 'vencida'
}

export interface DashboardData {
  kpis:                    KpiData
  ventas_serie:            VentaDia[]
  top_productos:           TopProducto[]
  top_clientes:            TopCliente[]
  distribucion_metodo_pago: MetodoPagoItem[]
  alertas_stock:           AlertaStock[]
  cxc_pendientes:          CxcItem[]
}
