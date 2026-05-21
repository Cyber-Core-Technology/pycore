// frontend/src/api/notificaciones-api.ts
import { api } from './axios-config'

export interface Notificacion {
  id: string
  tipo: 'tezca_insignia' | 'admin_mensaje' | 'sistema'
  titulo: string
  mensaje: string
  icono: string
  leida: boolean
  metadata: Record<string, unknown>
  created_at: string
  remitente_nombre: string | null
}

export interface InsigniaTezca {
  id: string
  tipo: string
  icono: string
  titulo: string
  descripcion: string
  metadata: Record<string, unknown>
  obtenida_en: string
}

const BASE = '/api/v1/notificaciones'

export const notificacionesApi = {
  listar: () =>
    api.get<{ results: Notificacion[] } | Notificacion[]>(BASE + '/').then((r) => {
      const d = r.data as any
      return Array.isArray(d) ? d : (d.results ?? [])
    }),

  noLeidas: () =>
    api.get<{ count: number }>(BASE + '/no-leidas/').then((r) => r.data),

  marcarLeida: (id: string) =>
    api.patch<Notificacion>(`${BASE}/${id}/leer/`).then((r) => r.data),

  marcarTodasLeidas: () =>
    api.post<{ updated: number }>(BASE + '/marcar-todas-leidas/').then((r) => r.data),

  broadcast: (data: { titulo: string; mensaje: string; rol_slug?: string }) =>
    api.post<{ enviadas: number }>(BASE + '/broadcast/', data).then((r) => r.data),
}

export const insigniasApi = {
  listar: () =>
    api.get<InsigniaTezca[]>('/api/v1/tezca/insignias/').then((r) => r.data),
}
