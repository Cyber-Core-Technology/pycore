// API del storefront para clientes — sin interceptor ERP JWT
import axios from 'axios'
import type { ClienteStorefront, ClientePerfilUpdate, Pedido, MetodoPago } from '@/types/store-customer.types'

const BASE = (import.meta.env.VITE_API_URL as string) ?? ''

const http = axios.create({ baseURL: BASE, timeout: 15_000 })

// Adjuntar token de cliente según slug
function headers(slug: string): Record<string, string> {
  const token = localStorage.getItem(`sf_access_${slug}`)
  return token ? { 'X-Storefront-Token': token } : {}
}

export const storeCustomerApi = {

  // ── Auth ────────────────────────────────────────────────────────────────

  enviarCodigo: (slug: string, data: { email: string; nombre: string }) =>
    http.post<{ detail: string }>(
      `/api/v1/store/${slug}/auth/enviar-codigo/`, data,
    ).then((r) => r.data),

  registro: (slug: string, data: { nombre: string; email: string; password: string; telefono?: string; otp_code: string; acepto_privacidad?: boolean }) =>
    http.post<{ access: string; refresh: string; cliente: ClienteStorefront }>(
      `/api/v1/store/${slug}/auth/registro/`, data,
    ).then((r) => r.data),

  login: (slug: string, data: { email: string; password: string }) =>
    http.post<{ access: string; refresh: string; cliente: ClienteStorefront }>(
      `/api/v1/store/${slug}/auth/login/`, data,
    ).then((r) => r.data),

  googleLogin: (slug: string, data: { credential: string; acepto_privacidad?: boolean }) =>
    http.post<{ access: string; refresh: string; cliente: ClienteStorefront }>(
      `/api/v1/store/${slug}/auth/google/`, data,
    ).then((r) => r.data),

  // ── 2FA ─────────────────────────────────────────────────────────────────

  twoFaVerify: (slug: string, data: { temp_token: string; code: string }) =>
    http.post<{ access: string; refresh: string; cliente: ClienteStorefront }>(
      `/api/v1/store/${slug}/auth/2fa/verify/`, data,
    ).then((r) => r.data),

  twoFaResend: (slug: string, temp_token: string) =>
    http.post<{ detail: string }>(`/api/v1/store/${slug}/auth/2fa/resend/`, { temp_token }).then((r) => r.data),

  twoFaSetup: (slug: string, method: 'totp' | 'email') =>
    http.post<{ method: string; qr_uri?: string; qr_image?: string; secret?: string; detail?: string }>(
      `/api/v1/store/${slug}/auth/2fa/setup/`, { method }, { headers: headers(slug) },
    ).then((r) => r.data),

  twoFaEnable: (slug: string, method: 'totp' | 'email', code: string) =>
    http.post<{ detail: string }>(
      `/api/v1/store/${slug}/auth/2fa/enable/`, { method, code }, { headers: headers(slug) },
    ).then((r) => r.data),

  twoFaDisable: (slug: string, code: string) =>
    http.post<{ detail: string }>(
      `/api/v1/store/${slug}/auth/2fa/disable/`, { code }, { headers: headers(slug) },
    ).then((r) => r.data),

  refresh: (slug: string) => {
    const token = localStorage.getItem(`sf_refresh_${slug}`)
    if (!token) return Promise.reject(new Error('No hay token de refresh'))
    return http.post<{ access: string }>(
      `/api/v1/store/${slug}/auth/refresh/`, { refresh: token },
    ).then((r) => r.data)
  },

  me: (slug: string) =>
    http.get<ClienteStorefront>(
      `/api/v1/store/${slug}/auth/me/`, { headers: headers(slug) },
    ).then((r) => r.data),

  actualizarPerfil: (slug: string, data: ClientePerfilUpdate) =>
    http.patch<ClienteStorefront>(
      `/api/v1/store/${slug}/auth/me/`, data, { headers: headers(slug) },
    ).then((r) => r.data),

  // ── Pedidos ─────────────────────────────────────────────────────────────

  crearPedido: (
    slug: string,
    data: {
      metodo_pago:   MetodoPago
      notas_cliente?: string
      detalles:      { producto_id: string; cantidad: number }[]
    },
  ) =>
    http.post<Pedido>(
      `/api/v1/store/${slug}/pedidos/`, data, { headers: headers(slug) },
    ).then((r) => r.data),

  getPedidos: (slug: string) =>
    http.get<Pedido[]>(
      `/api/v1/store/${slug}/pedidos/`, { headers: headers(slug) },
    ).then((r) => r.data),

  getPedido: (slug: string, pedidoId: string) =>
    http.get<Pedido>(
      `/api/v1/store/${slug}/pedidos/${pedidoId}/`, { headers: headers(slug) },
    ).then((r) => r.data),
}
