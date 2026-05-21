import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClienteStorefront } from '@/types/store-customer.types'

interface SlugSession {
  cliente:         ClienteStorefront | null
  isAuthenticated: boolean
}

interface SfAuthState {
  sessions: Record<string, SlugSession>

  getSession:      (slug: string) => SlugSession
  isAuthenticated: (slug: string) => boolean
  getCliente:      (slug: string) => ClienteStorefront | null
  getAccessToken:  (slug: string) => string | null
  setAuth:         (slug: string, cliente: ClienteStorefront, access: string, refresh: string) => void
  logout:          (slug: string) => void
}

export const useStorefrontAuth = create<SfAuthState>()(
  persist(
    (set, get) => ({
      sessions: {},

      getSession: (slug) =>
        get().sessions[slug] ?? { cliente: null, isAuthenticated: false },

      isAuthenticated: (slug) =>
        get().sessions[slug]?.isAuthenticated ?? false,

      getCliente: (slug) =>
        get().sessions[slug]?.cliente ?? null,

      getAccessToken: (slug) => {
        if (typeof window === 'undefined') return null
        return localStorage.getItem(`sf_access_${slug}`)
      },

      setAuth: (slug, cliente, access, refresh) => {
        localStorage.setItem(`sf_access_${slug}`,  access)
        localStorage.setItem(`sf_refresh_${slug}`, refresh)
        set((state) => ({
          sessions: {
            ...state.sessions,
            [slug]: { cliente, isAuthenticated: true },
          },
        }))
      },

      logout: (slug) => {
        localStorage.removeItem(`sf_access_${slug}`)
        localStorage.removeItem(`sf_refresh_${slug}`)
        set((state) => ({
          sessions: {
            ...state.sessions,
            [slug]: { cliente: null, isAuthenticated: false },
          },
        }))
      },
    }),
    { name: 'sf_auth' },
  ),
)
