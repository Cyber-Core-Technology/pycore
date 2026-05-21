import { api } from './axios-config'
import type {
  Producto, ProductoLight, StockItem, Movimiento,
  AjusteRequest, EntradaRequest, FiltrosProducto, FiltrosMovimiento,
  BarcodeLookupResult,
} from '@/types/inventory.types'

export const inventoryApi = {

  // ── Productos ──────────────────────────────────────────────────────────────

  async listarProductos(filtros: FiltrosProducto = {}): Promise<ProductoLight[]> {
    const params: Record<string, string> = {}
    if (filtros.q)    params.q    = filtros.q
    if (filtros.tipo) params.tipo = filtros.tipo
    const r = await api.get('/api/v1/inventory/productos/', { params })
    return r.data.results ?? r.data ?? []
  },

  async obtenerProducto(id: string): Promise<Producto> {
    const r = await api.get(`/api/v1/inventory/productos/${id}/`)
    return r.data
  },

  async crearProducto(data: Partial<Producto>): Promise<Producto> {
    const r = await api.post('/api/v1/inventory/productos/', data)
    return r.data
  },

  async actualizarProducto(id: string, data: Partial<Producto>): Promise<Producto> {
    const r = await api.patch(`/api/v1/inventory/productos/${id}/`, data)
    return r.data
  },

  async eliminarProducto(id: string): Promise<void> {
    await api.delete(`/api/v1/inventory/productos/${id}/`)
  },

  async uploadImagen(id: string, file: File): Promise<{ imagen_url: string }> {
    const fd = new FormData()
    fd.append('imagen', file)
    const r = await api.post(`/api/v1/inventory/productos/${id}/imagen/`, fd, {
      headers: { 'Content-Type': undefined },
    })
    return r.data
  },

  async deleteImagen(id: string): Promise<void> {
    await api.delete(`/api/v1/inventory/productos/${id}/imagen/`)
  },

  async uploadGaleriaImagen(id: string, file: File): Promise<{ imagen_url: string; galeria_imagenes: string[] }> {
    const fd = new FormData()
    fd.append('imagen', file)
    const r = await api.post(`/api/v1/inventory/productos/${id}/galeria/`, fd, {
      headers: { 'Content-Type': undefined },
    })
    return r.data
  },

  async removeGaleriaImagen(id: string, index: number): Promise<{ galeria_imagenes: string[] }> {
    const r = await api.delete(`/api/v1/inventory/productos/${id}/galeria/`, { data: { index } })
    return r.data
  },

  async buscarImagenes(id: string, q?: string): Promise<{ imageUrl: string; thumbnailUrl: string; title: string; source: string }[]> {
    const r = await api.get(`/api/v1/inventory/productos/${id}/buscar-imagenes/`, { params: q ? { q } : {} })
    return r.data
  },

  async imagenDesdeUrl(id: string, url: string): Promise<{ imagen_url: string }> {
    const r = await api.post(`/api/v1/inventory/productos/${id}/imagen-desde-url/`, { url })
    return r.data
  },

  async generarImagenesLote(opts: { solo_sin_imagen?: boolean; ids?: string[] } = {}): Promise<{ encolados: number; mensaje: string }> {
    const r = await api.post('/api/v1/inventory/productos/generar-imagenes/', {
      solo_sin_imagen: opts.solo_sin_imagen ?? true,
      ...(opts.ids ? { ids: opts.ids } : {}),
    })
    return r.data
  },

  async progresoImagenes(): Promise<{ status: string; total?: number; done?: number; encontradas?: number }> {
    const r = await api.get('/api/v1/inventory/productos/progreso-imagenes/')
    return r.data
  },

  // ── Stock ──────────────────────────────────────────────────────────────────

  async listarStock(sucursalId?: string): Promise<StockItem[]> {
    const params: Record<string, string> = {}
    if (sucursalId) params.sucursal_id = sucursalId
    const r = await api.get('/api/v1/inventory/inventario/', { params })
    return r.data.results ?? r.data ?? []
  },

  async alertasStock(): Promise<StockItem[]> {
    const r = await api.get('/api/v1/inventory/inventario/alertas/')
    return r.data.results ?? r.data ?? []
  },

  async registrarAjuste(data: AjusteRequest): Promise<Movimiento> {
    const r = await api.post('/api/v1/inventory/inventario/ajuste/', data)
    return r.data
  },

  async registrarEntrada(data: EntradaRequest): Promise<Movimiento> {
    const r = await api.post('/api/v1/inventory/inventario/entrada/', data)
    return r.data
  },

  // ── Movimientos ────────────────────────────────────────────────────────────

  async listarMovimientos(filtros: FiltrosMovimiento = {}): Promise<Movimiento[]> {
    const params: Record<string, string> = {}
    if (filtros.producto_id)     params.producto_id     = filtros.producto_id
    if (filtros.tipo_movimiento) params.tipo_movimiento = filtros.tipo_movimiento
    if (filtros.sucursal_id)     params.sucursal_id     = filtros.sucursal_id
    const r = await api.get('/api/v1/inventory/movimientos/', { params })
    return r.data.results ?? r.data ?? []
  },
  // ── Scan Session (PC → Cel) ───────────────────────────────────────────────

  async crearScanSession(baseUrl: string): Promise<{ token: string; qr_base64: string; url_escaneo: string; ttl_segundos: number }> {
    const r = await api.post('/api/v1/inventory/scan-session/crear/', { base_url: baseUrl })
    return r.data
  },

  async pollScanSession(token: string): Promise<{ listo: boolean; expirado: boolean; codigo_barras?: string; producto?: any }> {
    const r = await api.get(`/api/v1/inventory/scan-session/${token}/poll/`)
    return r.data
  },

  // ── Barcode ────────────────────────────────────────────────────────────────

  async buscarPorBarcode(codigo: string): Promise<BarcodeLookupResult> {
    const r = await api.get('/api/v1/inventory/productos/buscar-barcode/', { params: { codigo } })
    return r.data
  },
}
