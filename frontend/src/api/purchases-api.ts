import { api } from './axios-config'
import type {
  Compra,
  CompraLight,
  CrearCompraRequest,
  ActualizarCompraRequest,
  RecibirMercanciaRequest,
  FiltrosCompra,
} from '@/types/purchases.types'

export const purchasesApi = {

  async listar(filtros: FiltrosCompra = {}): Promise<CompraLight[]> {
    const params: Record<string, string> = {}
    if (filtros.estado)       params.estado       = filtros.estado
    if (filtros.id_proveedor) params.id_proveedor = filtros.id_proveedor
    if (filtros.id_sucursal)  params.id_sucursal  = filtros.id_sucursal
    if (filtros.fecha_desde)  params.fecha_desde  = filtros.fecha_desde
    if (filtros.fecha_hasta)  params.fecha_hasta  = filtros.fecha_hasta

    const r = await api.get('/api/v1/purchases/compras/', { params })
    return r.data.results ?? r.data ?? []
  },

  async obtener(idCompra: number): Promise<Compra> {
    // PK es AutoField (integer) — la URL espera el número, no el UUID
    const r = await api.get(`/api/v1/purchases/compras/${idCompra}/`)
    return r.data
  },

  async crear(data: CrearCompraRequest): Promise<Compra> {
    const r = await api.post('/api/v1/purchases/compras/', data)
    return r.data
  },

  async actualizar(idCompra: number, data: ActualizarCompraRequest): Promise<Compra> {
    const r = await api.patch(`/api/v1/purchases/compras/${idCompra}/`, data)
    return r.data
  },

  async confirmar(idCompra: number): Promise<Compra> {
    const r = await api.post(`/api/v1/purchases/compras/${idCompra}/confirmar/`)
    return r.data
  },

  async cancelar(idCompra: number, motivo = ''): Promise<Compra> {
    const r = await api.post(`/api/v1/purchases/compras/${idCompra}/cancelar/`, { motivo })
    return r.data
  },

  async recibirMercancia(idCompra: number, data: RecibirMercanciaRequest): Promise<Compra> {
    // items[].id_detalle es Integer (AutoField), NO UUID
    const r = await api.post(`/api/v1/purchases/compras/${idCompra}/recibir/`, data)
    return r.data
  },

  async subirComprobante(idCompra: number, archivo: File): Promise<Compra> {
    const fd = new FormData()
    fd.append('comprobante', archivo)
    const r = await api.post(`/api/v1/purchases/compras/${idCompra}/comprobantes/`, fd, {
      headers: { 'Content-Type': undefined as unknown as string },
    })
    return r.data
  },

  async eliminarComprobante(idCompra: number, comprobanteId: number): Promise<Compra> {
    const r = await api.delete(`/api/v1/purchases/compras/${idCompra}/comprobantes/${comprobanteId}/`)
    return r.data
  },
}
