import { Sun, Moon, Plus, Menu, ChevronDown, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { ROUTES }       from '@/router/routes'
import { useNavigate }  from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { NewSaleModal }   from '@/features/sales/NewSaleModal/NewSaleModal'
import { WsStatusDot }    from '@/components/common/WsStatusDot'
import { NotificacionesDropdown } from '@/components/common/NotificacionesDropdown'
import { SucursalPickerModal } from '@/features/auth/SucursalPickerModal/SucursalPickerModal'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher/LanguageSwitcher'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const sucursalActiva    = useAuthStore((s) => s.sucursalActiva)
  const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva)
  const usuario           = useAuthStore((s) => s.usuario)
  const { hasPermission } = usePermissions()
  const navigate = useNavigate()

  const sucursales = usuario?.sucursales ?? []
  const canSwitch  = sucursales.length > 1

  const [dark,          setDark]          = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  const [showNewSale,   setShowNewSale]   = useState(false)
  const [showSwitcher,  setShowSwitcher]  = useState(false)

  const toggleTheme = () => {
    const html = document.documentElement
    if (dark) { html.classList.remove('dark'); localStorage.setItem('pycore_theme', 'light') }
    else       { html.classList.add('dark');    localStorage.setItem('pycore_theme', 'dark')  }
    setDark(!dark)
  }

  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX'
  const fecha = new Date().toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <>
      {showNewSale && (
        <NewSaleModal
          onClose={() => setShowNewSale(false)}
          onSuccess={() => setShowNewSale(false)}
        />
      )}
      {showSwitcher && (
        <SucursalPickerModal
          sucursales={sucursales}
          onSelect={(s) => { setSucursalActiva(s); setShowSwitcher(false) }}
        />
      )}

      <header
        className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          height: '64px',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg transition-colors"
            aria-label={t('header.openMenu')}
            style={{ color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
          >
            <Menu size={18} />
          </button>
          <div>
            <h1 className="text-sm md:text-base font-semibold" style={{ color: 'var(--text)' }}>
              {t('header.title')}
            </h1>
            <p className="text-xs hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
              {fecha.charAt(0).toUpperCase() + fecha.slice(1)}
              {sucursalActiva ? ` · ${sucursalActiva.nombre}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSwitch && (
            <button
              type="button"
              onClick={() => setShowSwitcher(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
              title={t('header.changeBranch')}
            >
              <MapPin size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <span className="hidden md:inline max-w-[120px] truncate">
                {sucursalActiva?.nombre ?? t('header.branch')}
              </span>
              <ChevronDown size={12} />
            </button>
          )}

          <WsStatusDot />

          <LanguageSwitcher />

          <button
            onClick={toggleTheme}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            <span className="hidden md:inline">{dark ? t('header.lightMode') : t('header.darkMode')}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-all"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <NotificacionesDropdown />

          {hasPermission('ventas.crear') && (
            <button
              onClick={() => setShowNewSale(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)' }}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">{t('header.newSale')}</span>
            </button>
          )}
        </div>
      </header>
    </>
  )
}
