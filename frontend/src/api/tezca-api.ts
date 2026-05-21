import { api } from './axios-config'

export interface TezcaInsight {
  id: number
  origen: 'observador' | 'evento' | 'manual'
  tipo: 'alerta' | 'positivo' | 'info' | 'urgente'
  nivel: 'info' | 'warning' | 'success' | 'error'
  icono: string
  titulo: string
  mensaje: string
  accion_sugerida?: string
  leido: boolean
  created_at: string
}

export interface TezcaConsultaResponse {
  respuesta: string
  desde_cache: boolean
  peticiones_restantes: number
}

export interface TezcaStatusResponse {
  peticiones_usadas: number
  peticiones_restantes: number
  limite_diario: number
}

export const tezcaApi = {

  async getInsights(soloNoLeidos = false): Promise<TezcaInsight[]> {
    const params = soloNoLeidos ? { leido: false } : {}
    const r = await api.get('/api/v1/tezca/insights/', { params })
    return r.data.results ?? r.data ?? []
  },

  async getBadge(): Promise<number> {
    const r = await api.get('/api/v1/tezca/insights/badge/')
    return r.data.no_leidos ?? 0
  },

  async marcarLeido(id: number): Promise<void> {
    await api.patch(`/api/v1/tezca/insights/${id}/leer/`)
  },

  async consultar(pregunta: string): Promise<TezcaConsultaResponse> {
    const r = await api.post('/api/v1/tezca/consultar/', { pregunta })
    return r.data
  },

  async getStatus(): Promise<TezcaStatusResponse> {
    const r = await api.get('/api/v1/tezca/status/')
    return r.data
  },

  async getConversaciones() {
    const r = await api.get('/api/v1/tezca/conversaciones/')
    return r.data.results ?? r.data ?? []
  },
}
