// frontend/src/api/storefront-api.ts
import axios from 'axios'
import { api } from './axios-config'
import type { StorefrontConfig, ProductoPublico, ProductoDetalle, ProductoVisibilidadUpdate, PedidoGestion, ClienteStorefrontERP } from '@/types/storefront.types'

// Instancia pública: sin interceptor de JWT
const publicApi = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) ?? '',
  timeout: 10_000,
})

export const storefrontApi = {
  // ── ERP management (autenticado) ──────────────────────────────

  obtenerConfig: () =>
    api.get<StorefrontConfig>('/api/v1/storefront/config/').then((r) => r.data),

  actualizarConfig: (data: Partial<StorefrontConfig>) =>
    api.patch<StorefrontConfig>('/api/v1/storefront/config/', data).then((r) => r.data),

  preview: () =>
    api.get<{ config: StorefrontConfig; productos: ProductoPublico[] }>(
      '/api/v1/storefront/config/preview/'
    ).then((r) => r.data),

  bulkVisibilidad: (updates: ProductoVisibilidadUpdate[]) =>
    api.patch<{ updated: number }>('/api/v1/storefront/config/productos/', updates).then((r) => r.data),

  uploadBanner: (file: File) => {
    const fd = new FormData()
    fd.append('banner', file)
    return api.post<{ banner_url: string }>('/api/v1/storefront/config/banner/', fd, {
      headers: { 'Content-Type': undefined },
    }).then((r) => r.data)
  },

  deleteBanner: () =>
    api.delete('/api/v1/storefront/config/banner/').then((r) => r.data),

  checkSlug: (slug: string) =>
    api.get<{ available: boolean }>('/api/v1/storefront/config/check-slug/', { params: { slug } }).then((r) => r.data),

  // ── Gestión de pedidos (ERP autenticado) ───────────────────────

  getPedidos: (params?: { estado?: string }) =>
    api.get<PedidoGestion[]>('/api/v1/storefront/pedidos/', { params }).then((r) => r.data),

  updateEstadoPedido: (pedidoId: string, estado: string) =>
    api.patch<PedidoGestion>(`/api/v1/storefront/pedidos/${pedidoId}/estado/`, { estado }).then((r) => r.data),

  getClienteStorefront: (id: string) =>
    api.get<ClienteStorefrontERP>(`/api/v1/storefront/clientes/${id}/`).then((r) => r.data),

  // ── Público (sin auth) ─────────────────────────────────────────

  publicGetTienda: (slug: string) =>
    publicApi.get<StorefrontConfig>(`/api/v1/store/${slug}/`).then((r) => r.data),

  publicGetProductos: (
    slug: string,
    params?: { q?: string; categoria?: string; page?: number; page_size?: number }
  ) =>
    publicApi
      .get<{ count: number; next: string | null; previous: string | null; results: ProductoPublico[] }>(
        `/api/v1/store/${slug}/productos/`,
        { params }
      )
      .then((r) => r.data),

  publicGetProductoDetalle: (slug: string, productoSlug: string) =>
    publicApi
      .get<ProductoDetalle>(`/api/v1/store/${slug}/productos/${productoSlug}/`)
      .then((r) => r.data),
}
