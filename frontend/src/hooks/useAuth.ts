import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth-api'
import { api } from '@/api/axios-config'
import type { LoginCredentials, Sucursal } from '@/types/auth.types'

export function useLogin() {
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [showSplash,        setShowSplash]        = useState(false)
  const [onFinishCb,        setOnFinishCb]        = useState<(() => void) | null>(null)
  const [pendingSucursales, setPendingSucursales] = useState<Sucursal[]>([])

  const { setAuth, setSucursalActiva } = useAuthStore()
  const navigate = useNavigate()

  const login = async (credentials: LoginCredentials): Promise<any> => {
    setLoading(true)
    setError(null)

    try {
      const data = await authApi.login(credentials)

      if ((data as any).requires_2fa) {
        return data
      }

      setAuth(data.usuario, data.access, data.refresh)

      const sucursales: Sucursal[] = data.usuario.sucursales ?? []

      const roles = data.usuario.roles ?? []
      const isAdminRole = data.usuario.is_staff ||
        roles.some((r) => ['admin', 'administrador'].includes(r.toLowerCase()))

      if (isAdminRole && sucursales.length === 0) {
        // Admin sin sucursales asignadas → fallback a la sucursal principal de la empresa
        try {
          const res = await api.get('/api/v1/core/sucursales/')
          const lista = res.data.results ?? res.data ?? []
          const principal = lista.find((s: any) => s.es_principal) ?? lista[0]
          if (principal) {
            setSucursalActiva({
              id_sucursal:  principal.id_sucursal ?? principal.id,
              nombre:       principal.nombre,
              codigo:       principal.codigo ?? '',
              es_principal: principal.es_principal ?? true,
            })
          }
        } catch {}
        _goToDashboard()
        return true
      }

      if (sucursales.length === 0) {
        // Usuario regular sin sucursales → ProtectedRoute redirigirá a /sin-sucursal
        _goToDashboard()
        return true
      }

      if (sucursales.length === 1) {
        setSucursalActiva(sucursales[0])
        _goToDashboard()
        return true
      }

      // Múltiples sucursales → mostrar picker
      const predeterminada = sucursales.find((s) => s.es_predeterminada)
      if (predeterminada) {
        setSucursalActiva(predeterminada)
        _goToDashboard()
        return true
      }

      setPendingSucursales(sucursales)
      return true

    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.error ??
        (err as any)?.response?.data?.detail ??
        'Credenciales incorrectas'
      setError(msg)
      return false
    } finally {
      setLoading(false)
    }
  }

  const selectSucursal = (sucursal: Sucursal) => {
    setSucursalActiva(sucursal)
    setPendingSucursales([])
    _goToDashboard()
  }

  const _goToDashboard = () => {
    setOnFinishCb(() => () => navigate('/dashboard'))
    setShowSplash(true)
  }

  const handleSplashFinish = () => {
    setShowSplash(false)
    onFinishCb?.()
  }

  return {
    login,
    loading,
    error,
    showSplash,
    handleSplashFinish,
    pendingSucursales,
    selectSucursal,
  }
}

export function useLogout() {
  const { logout } = useAuthStore()
  const navigate   = useNavigate()

  return async () => {
    await authApi.logout().catch(() => {})
    logout()
    navigate('/login')
  }
}
