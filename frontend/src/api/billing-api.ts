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
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export const billingApi = {
  getPlanes: () =>
    api.get<SubscriptionPlan[]>('/api/v1/billing/planes/').then(r => r.data),

  getSuscripcion: () =>
    api.get<Subscription>('/api/v1/billing/suscripcion/').then(r => r.data),

  crearCheckout: (plan: string) =>
    api.post<{ url: string }>('/api/v1/billing/checkout/', { plan }).then(r => r.data),

  abrirPortal: () =>
    api.post<{ url: string }>('/api/v1/billing/portal/').then(r => r.data),
}
