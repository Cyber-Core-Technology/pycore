export interface LogAuditoria {
  id: string
  empresa:        string | null
  empresa_nombre: string
  empresa_slug:   string
  usuario:        string | null
  usuario_email:  string
  accion:         string
  accion_display: string
  tabla:          string
  id_registro:    string
  ip_address:     string | null
  created_at:     string
}

export interface AuditoriaFiltros {
  accion?:        string
  tabla?:         string
  usuario_email?: string
  fecha_desde?:   string
  fecha_hasta?:   string
  id_empresa?:    string   // solo superadmin
  page?:          number
  page_size?:     number
}

export interface AuditoriaPage {
  count:    number
  next:     string | null
  previous: string | null
  results:  LogAuditoria[]
}
