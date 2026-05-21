import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  Wallet, CreditCard, Receipt, DollarSign, UserCheck,
  BarChart2, LogOut, Store, AlertCircle, X, Sparkles,
  Lock, Settings, Globe, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi }      from '@/api/auth-api'
import { mediaUrl }     from '@/api/axios-config'
import { ROUTES }       from '@/router/routes'
import { useModules }   from '@/hooks/useModules'
import type { ModuleKey } from '@/hooks/useModules'
import { MODULE_MIN_PLAN, PLAN_LABELS } from '@/hooks/useModules'
import { usePermissions } from '@/hooks/usePermissions'
import { ProfileDrawer } from '@/features/auth/Profile/ProfileDrawer'

interface NavItem {
  labelKey:    string
  icon:        React.ElementType
  to:          string
  badge?:      number
  module?:     ModuleKey
  permission?: string
  adminOnly?:  boolean
}

interface NavSection {
  titleKey: string
  items: NavItem[]
}

const NAV_DEF: NavSection[] = [
  {
    titleKey: 'sidebar.sections.main',
    items: [
      { labelKey: 'sidebar.items.dashboard', icon: LayoutDashboard, to: ROUTES.DASHBOARD, permission: 'dashboard.ver' },
      { labelKey: 'sidebar.items.tezca',     icon: Sparkles,        to: ROUTES.TEZCA,   module: 'tezca' },
    ],
  },
  {
    titleKey: 'sidebar.sections.operations',
    items: [
      { labelKey: 'sidebar.items.sales',      icon: ShoppingCart, to: ROUTES.VENTAS,      module: 'ventas' },
      { labelKey: 'sidebar.items.purchases',  icon: Package,      to: ROUTES.COMPRAS,     module: 'compras' },
      { labelKey: 'sidebar.items.inventory',  icon: Store,        to: ROUTES.PRODUCTOS,   module: 'inventario' },
      { labelKey: 'sidebar.items.clients',    icon: Users,        to: ROUTES.CLIENTES,    module: 'clientes' },
      { labelKey: 'sidebar.items.providers',  icon: Truck,        to: ROUTES.PROVEEDORES, module: 'proveedores' },
    ],
  },
  {
    titleKey: 'sidebar.sections.finance',
    items: [
      { labelKey: 'sidebar.items.treasury', icon: Wallet,     to: ROUTES.TESORERIA, module: 'tesoreria' },
      { labelKey: 'sidebar.items.cxc',      icon: CreditCard, to: ROUTES.CXC,       module: 'cxc' },
      { labelKey: 'sidebar.items.cxp',      icon: Receipt,    to: ROUTES.CXP,       module: 'cxp' },
      { labelKey: 'sidebar.items.expenses', icon: DollarSign, to: ROUTES.GASTOS,    module: 'gastos' },
    ],
  },
  {
    titleKey: 'sidebar.sections.store',
    items: [
      { labelKey: 'sidebar.items.myStore', icon: Globe, to: ROUTES.MI_TIENDA, module: 'storefront' },
    ],
  },
  {
    titleKey: 'sidebar.sections.management',
    items: [
      { labelKey: 'sidebar.items.hr',       icon: UserCheck,   to: ROUTES.COLABORADORES,  module: 'rrhh' },
      { labelKey: 'sidebar.items.reports',  icon: BarChart2,   to: ROUTES.REPORTES,       module: 'reportes' },
      { labelKey: 'sidebar.items.audit',    icon: ShieldCheck, to: ROUTES.AUDITORIA,      adminOnly: true },
      { labelKey: 'sidebar.items.settings', icon: Settings,    to: ROUTES.CONFIGURACION,  module: 'configuracion', adminOnly: true },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const usuario  = useAuthStore((s) => s.usuario)
  const logout   = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { hasModule } = useModules()
  const { hasPermission } = usePermissions()
  const isAdmin = usuario?.is_staff || (usuario?.roles ?? []).includes('admin')
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    await authApi.logout().catch(() => {})
    logout()
    navigate(ROUTES.LOGIN)
  }

  const planLabel = usuario?.empresa?.plan
    ? PLAN_LABELS[usuario.empresa.plan as keyof typeof PLAN_LABELS] ?? usuario.empresa.plan
    : ''

  const sidebarContent = (
    <aside
      className="flex flex-col h-full sidebar-enter"
      style={{
        width: '220px',
        minWidth: '220px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-5 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/favicon.svg"
            alt="PyCore ERP"
            className="flex-shrink-0"
            style={{ width: 36, height: 36, objectFit: 'contain' }}
          />
          <div>
            <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--sidebar-text)' }}>
              PyCore ERP
            </p>
            <p className="text-xs" style={{ color: 'var(--sidebar-text)', opacity: 0.55 }}>
              {t('sidebar.tagline')}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-lg"
          style={{ color: 'var(--sidebar-text)', opacity: 0.5 }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV_DEF.map((section) => (
          <div key={section.titleKey} className="mb-4">
            <p
              className="text-xs font-semibold px-3 mb-1"
              style={{ color: 'var(--sidebar-text)', opacity: 0.5, letterSpacing: '0.06em' }}
            >
              {t(section.titleKey)}
            </p>
            {section.items.filter((item) =>
              (!item.permission || hasPermission(item.permission)) &&
              (!item.adminOnly || isAdmin)
            ).map((item) => {
              const label  = t(item.labelKey)
              const locked = item.module ? !hasModule(item.module) : false
              const minPlan = item.module ? MODULE_MIN_PLAN[item.module] : undefined
              const tooltip = locked && minPlan
                ? `${t('sidebar.requiresPlan')} ${PLAN_LABELS[minPlan]}`
                : label

              if (locked) {
                return (
                  <div
                    key={item.to}
                    title={tooltip}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5"
                    style={{
                      cursor: 'not-allowed',
                      opacity: 0.38,
                      color: 'var(--sidebar-text)',
                      userSelect: 'none',
                    }}
                  >
                    <item.icon size={16} style={{ flexShrink: 0 }} />
                    <span className="flex-1">{label}</span>
                    <Lock size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className="sidebar-nav-link flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all duration-150"
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--sidebar-active)' : 'transparent',
                    color:      isActive ? '#FFFFFF' : 'var(--sidebar-text)',
                    fontWeight: isActive ? 600 : 400,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={16} style={{ flexShrink: 0, color: isActive ? '#FFFFFF' : 'var(--sidebar-text)' }} />
                      <span className="flex-1">{label}</span>
                      {item.badge ? (
                        <span
                          className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                          style={{ background: 'var(--color-error)', color: '#fff' }}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Alerta stock bajo */}
      <div className="px-3 pb-2">
        <NavLink
          to={ROUTES.ALERTAS_STOCK ?? '/inventario/alertas'}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
          style={{ background: 'var(--color-error-bg)', color: '#F87171' }}
        >
          <AlertCircle size={13} />
          <span>{t('inventory.lowStock')}</span>
        </NavLink>
      </div>

      {/* Usuario */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          title={t('profile.title')}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer',
            background: 'var(--color-primary)',
          }}
        >
          {usuario?.foto_url ? (
            <img
              src={mediaUrl(usuario.foto_url)}
              alt={usuario.nombre_completo}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 13, fontWeight: 700, color: 'var(--color-primary-text)' }}>
              {usuario?.nombre_completo?.charAt(0) ?? 'U'}
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--sidebar-text)' }}>
            {usuario?.nombre_completo ?? 'Usuario'}
          </p>
          {planLabel ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(245,158,11,0.15)',
                color: 'var(--color-warning)',
                display: 'inline-block',
                marginTop: 2,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {planLabel}
            </span>
          ) : null}
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--sidebar-text)', opacity: 0.55 }}
          title={t('storefront.logout')}
        >
          <LogOut size={15} />
        </button>
      </div>

      {profileOpen && <ProfileDrawer onClose={() => setProfileOpen(false)} />}
    </aside>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          />
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
