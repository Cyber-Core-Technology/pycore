import { useAuthStore } from '@/store/authStore'
import { getRolePermissions } from '@/lib/rolePermissionsConfig'

export function usePermissions() {
  const usuario = useAuthStore((s) => s.usuario)
  const roles   = usuario?.roles ?? []

  // Sin roles = superadmin (acceso total)
  const isSuperAdmin = roles.length === 0

  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin) return true
    const rolePerms = getRolePermissions()
    return roles.some((rol) => rolePerms[rol]?.includes(permission))
  }

  const hasAnyPermission = (...permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p))
  }

  return { hasPermission, hasAnyPermission, isSuperAdmin, roles }
}
