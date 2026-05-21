import { api } from './axios-config'

export const pushApi = {
  getVapidKey: () =>
    api.get<{ public_key: string }>('/api/v1/notifications/push/vapid-key/').then((r) => r.data),

  subscribe: (subscription: PushSubscriptionJSON) =>
    api.post('/api/v1/notifications/push/subscribe/', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh,
        auth:   subscription.keys?.auth,
      },
    }).then((r) => r.data),

  unsubscribe: (endpoint: string) =>
    api.delete('/api/v1/notifications/push/subscribe/', { data: { endpoint } }).then((r) => r.data),
}
