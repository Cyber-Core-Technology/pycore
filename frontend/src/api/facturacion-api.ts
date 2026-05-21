import { api } from './axios-config'
import type {
  CFDI,
  CatalogoSATItem,
  ConfiguracionFacturacion,
  SubirCSDPayload,
  ActualizarConfiguracionPayload,
} from '@/types/facturacion.types'

const BASE = '/api/v1/facturacion/cfdis'

export const facturacionApi = {

  // ── CFDIs ────────────────────────────────────────────────────────────────

  listar(): Promise<CFDI[]> {
    return api.get<CFDI[]>(BASE + '/').then(r => r.data)
  },

  obtener(id: number): Promise<CFDI> {
    return api.get<CFDI>(`${BASE}/${id}/`).then(r => r.data)
  },

  cancelar(id: number, motivo: '01' | '02' | '03' | '04'): Promise<CFDI> {
    return api.post<CFDI>(`${BASE}/${id}/cancelar/`, { motivo }).then(r => r.data)
  },

  // ── Descargas ─────────────────────────────────────────────────────────────

  /** URL pre-firmada S3 con expiración de 15 min */
  async urlDescarga(id: number, formato: 'pdf' | 'xml'): Promise<string> {
    const r = await api.get<{ url: string }>(`${BASE}/${id}/url-descarga/?formato=${formato}`)
    return r.data.url
  },

  /** Descarga directa del servidor (fallback) */
  urlDescargarDirecto(id: number, formato: 'pdf' | 'xml'): string {
    return `${BASE}/${id}/descargar/?formato=${formato}`
  },

  // ── Configuración ─────────────────────────────────────────────────────────

  configuracion(): Promise<ConfiguracionFacturacion> {
    return api.get<ConfiguracionFacturacion>(`${BASE}/configuracion/`).then(r => r.data)
  },

  actualizarConfiguracion(data: ActualizarConfiguracionPayload): Promise<ConfiguracionFacturacion> {
    return api.patch<ConfiguracionFacturacion>(`${BASE}/configuracion/`, data).then(r => r.data)
  },

  // ── CSD ───────────────────────────────────────────────────────────────────

  subirCSD(payload: SubirCSDPayload): Promise<{ detail: string; numero_certificado?: string; fecha_vencimiento?: string }> {
    return api.post(`${BASE}/subir-csd/`, payload).then(r => r.data)
  },

  // ── Catálogos SAT ─────────────────────────────────────────────────────────

  catUsoCFDI(tipo?: 'fisica' | 'moral'): Promise<CatalogoSATItem[]> {
    const params = tipo ? `?tipo=${tipo}` : ''
    return api.get<CatalogoSATItem[]>(`${BASE}/catalogos/uso-cfdi/${params}`).then(r => r.data)
  },

  catRegimenFiscal(tipo?: 'fisica' | 'moral'): Promise<CatalogoSATItem[]> {
    const params = tipo ? `?tipo=${tipo}` : ''
    return api.get<CatalogoSATItem[]>(`${BASE}/catalogos/regimen-fiscal/${params}`).then(r => r.data)
  },

  catFormaPago(): Promise<CatalogoSATItem[]> {
    return api.get<CatalogoSATItem[]>(`${BASE}/catalogos/forma-pago/`).then(r => r.data)
  },
}
