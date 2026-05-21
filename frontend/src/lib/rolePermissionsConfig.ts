const STORAGE_KEY = 'pycore_role_permissions'

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'Administrador': [
    'dashboard.ver',
    'ventas.ver', 'ventas.crear', 'ventas.cancelar', 'ventas.exportar', 'ventas.reportes',
    'compras.ver', 'compras.crear', 'compras.confirmar', 'compras.cancelar', 'compras.recibir',
    'inventario.ver', 'inventario.crear', 'inventario.editar',
    'clientes.ver', 'clientes.crear', 'clientes.editar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
    'finanzas.ver', 'finanzas.crear',
    'rrhh.ver', 'rrhh.crear', 'rrhh.editar',
    'reportes.ver',
  ],
  'Vendedor': [
    'ventas.ver', 'ventas.crear',
    'clientes.ver',
    'inventario.ver',
    'finanzas.crear',
  ],
  'Contador': [
    'ventas.ver', 'ventas.exportar', 'ventas.reportes',
    'compras.ver',
    'finanzas.ver', 'finanzas.crear',
    'reportes.ver',
  ],
  'Almacenista': [
    'inventario.ver', 'inventario.crear', 'inventario.editar',
    'compras.ver', 'compras.recibir',
  ],
  'Consultor': [
    'ventas.ver',
    'compras.ver',
    'inventario.ver',
    'finanzas.ver',
    'reportes.ver',
  ],
  'Cajero': [
    'ventas.ver', 'ventas.crear',
    'clientes.ver',
    'inventario.ver',
  ],
  'admin': [
    'dashboard.ver',
    'ventas.ver', 'ventas.crear', 'ventas.cancelar', 'ventas.exportar', 'ventas.reportes',
    'compras.ver', 'compras.crear', 'compras.confirmar', 'compras.cancelar', 'compras.recibir',
    'inventario.ver', 'inventario.crear', 'inventario.editar',
    'clientes.ver', 'clientes.crear', 'clientes.editar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
    'finanzas.ver', 'finanzas.crear',
    'rrhh.ver', 'rrhh.crear', 'rrhh.editar',
    'reportes.ver',
  ],
}

export function getRolePermissions(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string[]>
      return { ...DEFAULT_ROLE_PERMISSIONS, ...parsed }
    }
  } catch {}
  return DEFAULT_ROLE_PERMISSIONS
}

export function saveRolePermissions(custom: Record<string, string[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
}

export function resetRolePermissions(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getCustomRolePermissions(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Record<string, string[]>
  } catch {}
  return {}
}
