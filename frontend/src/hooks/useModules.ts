import { useAuthStore } from '@/store/authStore'
import type { PlanEmpresa } from '@/types/superadmin.types'

export type ModuleKey =
  | 'ventas' | 'compras' | 'inventario' | 'clientes' | 'proveedores'
  | 'tesoreria' | 'cxc' | 'cxp' | 'gastos' | 'reportes'
  | 'rrhh' | 'tezca' | 'configuracion' | 'storefront'

const PLAN_MODULES: Record<PlanEmpresa, ModuleKey[]> = {
  basico: [
    'ventas', 'compras', 'inventario', 'clientes', 'proveedores',
    'configuracion', 'storefront',
  ],
  profesional: [
    'ventas', 'compras', 'inventario', 'clientes', 'proveedores',
    'tesoreria', 'cxc', 'cxp', 'gastos', 'reportes',
    'tezca', 'configuracion', 'storefront',
  ],
  empresarial: [
    'ventas', 'compras', 'inventario', 'clientes', 'proveedores',
    'tesoreria', 'cxc', 'cxp', 'gastos', 'reportes',
    'rrhh', 'tezca', 'configuracion', 'storefront',
  ],
  elite: [
    'ventas', 'compras', 'inventario', 'clientes', 'proveedores',
    'tesoreria', 'cxc', 'cxp', 'gastos', 'reportes',
    'rrhh', 'tezca', 'configuracion', 'storefront',
  ],
}

export interface PlanLimits {
  maxUsuarios: number
  maxSucursales: number
}

const PLAN_LIMITS: Record<PlanEmpresa, PlanLimits> = {
  basico:      { maxUsuarios: 3,        maxSucursales: 1        },
  profesional: { maxUsuarios: 10,       maxSucursales: 3        },
  empresarial: { maxUsuarios: 30,       maxSucursales: Infinity },
  elite:       { maxUsuarios: Infinity, maxSucursales: Infinity },
}

export const PLAN_LABELS: Record<PlanEmpresa, string> = {
  basico:      'Básico',
  profesional: 'Profesional',
  empresarial: 'Empresarial',
  elite:       'Elite',
}

/** Plan mínimo requerido por módulo (para mostrar en tooltips de bloqueo) */
export const MODULE_MIN_PLAN: Partial<Record<ModuleKey, PlanEmpresa>> = {
  tesoreria:     'profesional',
  cxc:           'profesional',
  cxp:           'profesional',
  gastos:        'profesional',
  reportes:      'profesional',
  rrhh:          'empresarial',
  tezca:         'profesional',
}

export function useModules() {
  const empresa = useAuthStore((s) => s.usuario?.empresa)
  const isSuperAdmin = useAuthStore((s) => !s.usuario?.empresa)

  const plan = (empresa?.plan ?? 'basico') as PlanEmpresa
  const activeModules = isSuperAdmin
    ? PLAN_MODULES.elite
    : (PLAN_MODULES[plan] ?? PLAN_MODULES.basico)
  const limits = isSuperAdmin
    ? PLAN_LIMITS.elite
    : (PLAN_LIMITS[plan] ?? PLAN_LIMITS.basico)

  const hasModule = (key: ModuleKey): boolean => {
    if (isSuperAdmin) return true
    return activeModules.includes(key)
  }

  return { hasModule, limits, plan, activeModules, isSuperAdmin }
}
