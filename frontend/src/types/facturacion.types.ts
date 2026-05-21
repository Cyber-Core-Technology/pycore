export type EstadoCFDI = 'pendiente' | 'timbrado' | 'enviado' | 'cancelado' | 'error'
export type TipoComprobante = 'I' | 'E' | 'T' | 'P'
export type MetodoPagoSAT = 'PUE' | 'PPD'
export type MotivoCancelacion = '01' | '02' | '03' | '04'

export interface CFDI {
  id: number
  folio_venta: string
  uuid_sat: string | null
  pac_cfdi_id: string
  serie: string
  folio: string
  rfc_receptor: string
  razon_social_receptor: string
  uso_cfdi: string
  subtotal: string
  descuento: string
  impuestos: string
  total: string
  estado: EstadoCFDI
  estado_display: string
  tipo_comprobante: TipoComprobante
  tipo_display: string
  fecha_timbrado: string | null
  fecha_cancelado: string | null
  motivo_cancelacion: string
  email_receptor: string
  xml_s3_key: string
  pdf_s3_key: string
  created_at: string
}

export interface ConfiguracionFacturacion {
  csd_subido: boolean
  csd_numero_certificado: string
  csd_fecha_subida: string | null
  csd_fecha_vencimiento: string | null
  regimen_fiscal: string
  codigo_postal_expedicion: string
  serie_cfdi: string
  folio_actual: number
  activo: boolean
  esta_lista: boolean
}

export interface SolicitarFacturaPayload {
  rfc_receptor: string
  razon_social_receptor: string
  regimen_fiscal_receptor: string
  uso_cfdi: string
  codigo_postal_receptor: string
  email_receptor: string
}

export interface SubirCSDPayload {
  certificado_b64: string
  llave_b64: string
  password_csd: string
}

export interface CatalogoSATItem {
  clave: string
  descripcion: string
}

export interface ActualizarConfiguracionPayload {
  regimen_fiscal?: string
  codigo_postal_expedicion?: string
  serie_cfdi?: string
  activo?: boolean
}
