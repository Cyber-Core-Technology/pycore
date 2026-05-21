import { api } from './axios-config'
import type { LoginCredentials, LoginResponse } from '@/types/auth.types'

export const authApi = {
  login: (credentials: LoginCredentials) => {
    const trust_token = localStorage.getItem('pycore_2fa_trust') ?? undefined
    return api.post<LoginResponse>('/api/v1/auth/login/', { ...credentials, trust_token }).then((r) => r.data)
  },

  logout: () => {
    const refresh = localStorage.getItem('pycore_refresh')
    return api.post('/api/v1/auth/logout/', { refresh: refresh ?? '' }).catch(() => {})
  },

  me: () =>
    api.get('/api/v1/auth/me/').then((r) => r.data),

  actualizarPerfil: (data: {
    nombre?: string
    apellido_paterno?: string
    apellido_materno?: string
    telefono?: string
    idioma?: string
    zona_horaria?: string
  }) => api.patch('/api/v1/auth/me/', data).then((r) => r.data),

  subirFoto: (file: File) => {
    const form = new FormData()
    form.append('foto', file)
    return api.post<{ foto_url: string }>('/api/v1/auth/me/foto/', form, {
      headers: { 'Content-Type': undefined },
    }).then((r) => r.data)
  },

  eliminarFoto: () =>
    api.delete('/api/v1/auth/me/foto/'),

  cambiarPassword: (data: {
    password_actual: string
    password_nuevo: string
    password_confirm: string
  }) => api.post('/api/v1/auth/me/password/', data).then((r) => r.data),

  // ── 2FA ────────────────────────────────────────────────────────────────

  twoFaVerify: (data: { temp_token: string; code: string }) =>
    api.post<{ access: string; refresh: string; usuario: any; trust_token?: string }>(
      '/api/v1/auth/2fa/verify/', data, { skipAuthRefresh: true } as any,
    ).then((r) => r.data),

  twoFaResend: (temp_token: string) =>
    api.post<{ detail: string }>('/api/v1/auth/2fa/resend/', { temp_token }).then((r) => r.data),

  twoFaSetup: (method: 'totp' | 'email') =>
    api.post<{ method: string; qr_uri?: string; qr_image?: string; secret?: string; detail?: string }>(
      '/api/v1/auth/me/2fa/setup/', { method },
    ).then((r) => r.data),

  twoFaEnable: (method: 'totp' | 'email', code: string) =>
    api.post<{ detail: string }>('/api/v1/auth/me/2fa/enable/', { method, code }).then((r) => r.data),

  twoFaDisable: (code: string) =>
    api.post<{ detail: string }>('/api/v1/auth/me/2fa/disable/', { code }).then((r) => r.data),

  register: (data: {
    nombre_empresa: string
    tipo_negocio: string
    giro_negocio?: string
    plan: string
    nombre: string
    apellido_paterno?: string
    email: string
    password: string
    password_confirm: string
    telefono?: string
    rfc?: string
  }) =>
    api.post<{ message: string; access: string; refresh: string; usuario: any; checkout_url?: string }>(
      '/api/v1/auth/register/', data, { skipAuthRefresh: true } as any,
    ).then((r) => r.data),
}
