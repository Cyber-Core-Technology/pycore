import { api } from './axios-config'

export interface SubscriptionPlan {
  id: string
  plan_key: 'basico' | 'profesional' | 'empresarial'
  nombre: string
  precio_mensual: string
  max_usuarios: number
  max_sucursales: number
  tezca_consultas: number
}

export interface Subscription {
  id: string
  plan: SubscriptionPlan | null
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'elite' | 'no_subscription'
  is_active: boolean
  /** Nº de sucursales activas que se están facturando */
  sucursales_activas?: number
  /** Total mensual = precio por sucursal × sucursales activas */
  total_mensual?: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface BranchPreview {
  applicable: boolean
  currency?: string
  precio_unitario?: string
  sucursales_actuales?: number
  sucursales_nuevas?: number
  mensualidad_actual?: string
  mensualidad_nueva?: string
  cargo_prorrateado?: string
  proximo_recibo_total?: string
  proximo_cobro_fecha?: string | null
}

export const billingApi = {
  getPlanes: () =>
    api.get<SubscriptionPlan[]>('/api/v1/billing/planes/').then(r => r.data),

  previewBranch: () =>
    api.get<BranchPreview>('/api/v1/billing/preview-branch/').then(r => r.data),

  getSuscripcion: () =>
    api.get<Subscription>('/api/v1/billing/suscripcion/').then(r => r.data),

  crearCheckout: (plan: string) =>
    api.post<{ url: string }>('/api/v1/billing/checkout/', { plan }).then(r => r.data),

  abrirPortal: () =>
    api.post<{ url: string }>('/api/v1/billing/portal/').then(r => r.data),
}
