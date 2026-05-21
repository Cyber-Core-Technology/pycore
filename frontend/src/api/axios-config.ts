import axios from 'axios'
import { wsClient } from '@/services/websocket'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://api.pycore.app'

/** Convierte rutas relativas /media/... a URL absoluta del backend */
export const mediaUrl = (path: string | null | undefined): string => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// ─── Request interceptor: inyectar token + sucursal activa ───
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pycore_access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  try {
    const raw = localStorage.getItem('pycore_auth')
    if (raw) {
      const authState = JSON.parse(raw)
      const sucursalId = authState?.state?.sucursalActiva?.id_sucursal
      if (sucursalId) {
        config.headers['X-Sucursal-ID'] = sucursalId
      }
    }
  } catch {}

  return config
})

// ─── Response interceptor: refresh automático ────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    const refresh = localStorage.getItem('pycore_refresh')

    if (!refresh) {
      isRefreshing = false
      // Sin refresh token → logout
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post(
        `${BASE_URL}/api/v1/auth/token/refresh/`,
        { refresh }
      )
      const newAccess: string = data.access
      localStorage.setItem('pycore_access', newAccess)
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
      processQueue(null, newAccess)
      originalRequest.headers.Authorization = `Bearer ${newAccess}`
      wsClient.connect(newAccess)
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
