import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from '@/types/auth.types'

interface Sucursal {
  id_sucursal: string
  nombre: string
  codigo: string
  es_principal: boolean
}

interface AuthState {
  usuario:        Usuario | null
  sucursalActiva: Sucursal | null
  isAuthenticated: boolean

  // Acciones
  setAuth:           (usuario: Usuario, access: string, refresh: string) => void
  setUsuario:        (usuario: Usuario) => void
  setSucursalActiva: (sucursal: Sucursal) => void
  logout:            () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario:         null,
      sucursalActiva:  null,
      isAuthenticated: false,

      setAuth: (usuario, access, refresh) => {
        localStorage.setItem('pycore_access', access)
        localStorage.setItem('pycore_refresh', refresh)
        set({ usuario, isAuthenticated: true })
      },

      setUsuario: (usuario) => set({ usuario }),

      setSucursalActiva: (sucursal) => {
        set({ sucursalActiva: sucursal })
      },

      logout: () => {
        localStorage.removeItem('pycore_access')
        localStorage.removeItem('pycore_refresh')
        set({ usuario: null, sucursalActiva: null, isAuthenticated: false })
      },
    }),
    {
      name: 'pycore_auth',
      // Solo persistir lo no sensible
      partialize: (state) => ({
        usuario:         state.usuario,
        sucursalActiva:  state.sucursalActiva,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
