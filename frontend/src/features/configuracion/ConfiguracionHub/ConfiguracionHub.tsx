import { useNavigate } from 'react-router-dom'
import {
  Building2, MapPin, Tag, Users, Bell, ChevronRight,
  Percent, Ruler, FileText, Palette, CreditCard, ShieldCheck,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { coreApi } from '@/api/core-api'
import { catalogsApi } from '@/api/catalogs-api'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/router/routes'
import { PALETTES } from '@/lib/themes'

interface HubCard {
  icon:        React.ElementType
  iconColor:   string
  iconBg:      string
  title:       string
  description: string
  to:          string
  badge?:      string | number
  adminOnly?:  boolean
}

export function ConfiguracionHub() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const usuario    = useAuthStore((s) => s.usuario)
  const isAdmin    = useAuthStore((s) => {
    const u = s.usuario
    return u?.is_staff || (u?.roles ?? []).some(r => r === 'admin' || r === 'Administrador')
  })
  const { hasPermission } = usePermissions()
  const empresaId  = usuario?.empresa?.id
  const plan       = usuario?.empresa?.plan ?? ''
  const themeKey   = usuario?.empresa?.theme_key ?? 'esmeralda'
  const themeName  = PALETTES[themeKey]?.name ?? 'Esmeralda'
  const canTheme   = plan === 'empresarial' || plan === 'elite'

  const { data: empresa } = useQuery({
    queryKey: ['empresa-config', empresaId],
    queryFn:  () => coreApi.empresa.obtener(empresaId!),
    enabled:  !!empresaId,
  })

  const { data: sucursales } = useQuery({
    queryKey: ['sucursales-config'],
    queryFn:  coreApi.sucursales.listar,
  })

  const { data: categorias } = useQuery({
    queryKey: ['categorias-count'],
    queryFn:  () => catalogsApi.categorias.listar(),
  })

  const { data: impuestos } = useQuery({
    queryKey: ['impuestos-count'],
    queryFn:  () => catalogsApi.impuestos.listar(),
  })

  const { data: unidades } = useQuery({
    queryKey: ['unidades-count'],
    queryFn:  () => catalogsApi.unidades.listar(),
  })

  const catCount  = (categorias?.filter(c => c.activo).length ?? 0)
  const impCount  = (impuestos?.filter(i => i.activo).length ?? 0)
  const uniCount  = (unidades?.filter(u => u.activo).length ?? 0)
  const sucCount  = (sucursales?.length ?? 0)

  const catalogoBadge = [
    catCount  ? `${catCount} cat.`  : null,
    impCount  ? `${impCount} imp.`  : null,
    uniCount  ? `${uniCount} u.m.`  : null,
  ].filter(Boolean).join(' · ') || t('config.hub.cards.catalogs.none')

  const CARDS: HubCard[] = [
    {
      icon:        Building2,
      iconColor:   'var(--color-info)',
      iconBg:      'var(--color-info-bg)',
      title:       t('config.hub.cards.company.title'),
      description: t('config.hub.cards.company.desc'),
      to:          ROUTES.CONFIGURACION_EMPRESA,
      badge:       empresa?.nombre ?? '...',
    },
    {
      icon:        MapPin,
      iconColor:   '#10B981',
      iconBg:      'rgba(16,185,129,0.12)',
      title:       t('config.hub.cards.branches.title'),
      description: t('config.hub.cards.branches.desc'),
      to:          ROUTES.CONFIGURACION_SUCURSALES,
      badge:       sucCount
        ? `${sucCount} ${sucCount !== 1 ? t('config.hub.cards.branches.activePlural') : t('config.hub.cards.branches.activeSingular')}`
        : t('config.hub.cards.branches.none'),
    },
    {
      icon:        Tag,
      iconColor:   'var(--color-warning)',
      iconBg:      'var(--color-warning-bg)',
      title:       t('config.hub.cards.catalogs.title'),
      description: t('config.hub.cards.catalogs.desc'),
      to:          ROUTES.CONFIGURACION_CATALOGOS,
      badge:       catalogoBadge,
    },
    {
      icon:        Users,
      iconColor:   '#8B5CF6',
      iconBg:      'rgba(139,92,246,0.12)',
      title:       t('config.hub.cards.users.title'),
      description: t('config.hub.cards.users.desc'),
      to:          ROUTES.CONFIGURACION_USUARIOS,
    },
    {
      icon:        Bell,
      iconColor:   'var(--color-error)',
      iconBg:      'var(--color-error-bg)',
      title:       t('config.hub.cards.notifications.title'),
      description: t('config.hub.cards.notifications.desc'),
      to:          ROUTES.CONFIGURACION_NOTIFICACIONES,
      adminOnly:   true,
    },
    {
      icon:        FileText,
      iconColor:   '#0EA5E9',
      iconBg:      'rgba(14,165,233,0.12)',
      title:       t('config.hub.cards.billing.title'),
      description: t('config.hub.cards.billing.desc'),
      to:          ROUTES.CONFIGURACION_FACTURACION,
      adminOnly:   true,
    },
    {
      icon:        Palette,
      iconColor:   '#8B5CF6',
      iconBg:      'rgba(139,92,246,0.12)',
      title:       t('config.hub.cards.personalization.title'),
      description: t('config.hub.cards.personalization.desc'),
      to:          ROUTES.CONFIGURACION_PERSONALIZACION,
      badge:       canTheme ? themeName : t('config.hub.cards.personalization.locked'),
      adminOnly:   true,
    },
    {
      icon:        CreditCard,
      iconColor:   '#0EA5E9',
      iconBg:      'rgba(14,165,233,0.12)',
      title:       t('config.hub.cards.subscription.title', { defaultValue: 'Suscripción' }),
      description: t('config.hub.cards.subscription.desc', { defaultValue: 'Plan activo, facturación y próxima fecha de cobro' }),
      to:          ROUTES.CONFIGURACION_SUSCRIPCION,
      badge:       plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : undefined,
      adminOnly:   true,
    },
    {
      icon:        ShieldCheck,
      iconColor:   '#10B981',
      iconBg:      'rgba(16,185,129,0.12)',
      title:       t('config.hub.cards.roles.title', { defaultValue: 'Roles y Permisos' }),
      description: t('config.hub.cards.roles.desc', { defaultValue: 'Configura los accesos de cada rol en tu empresa' }),
      to:          ROUTES.CONFIGURACION_ROLES,
      adminOnly:   true,
    },
  ]

  const visibleCards = CARDS.filter(c => !c.adminOnly || isAdmin)

  return (
    <main style={{ padding: '20px 0 40px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {t('config.hub.title')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          {t('config.hub.subtitle')}
        </p>
      </div>

      {/* Grid de tarjetas */}
      <div
        role="list"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
          gap: 16,
        }}
      >
        {visibleCards.map((card) => (
          <button
            key={card.to}
            role="listitem"
            onClick={() => navigate(card.to)}
            aria-label={t('config.hub.goTo', { title: card.title })}
            style={{
              display:       'flex',
              flexDirection: 'column',
              gap:           16,
              padding:       '20px 20px 18px',
              background:    'var(--surface)',
              border:        '1px solid var(--border)',
              borderRadius:  12,
              cursor:        'pointer',
              textAlign:     'left',
              transition:    'border-color 0.15s, transform 0.1s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.borderColor  = 'var(--color-primary)'
              el.style.boxShadow    = '0 4px 16px rgba(0,0,0,0.08)'
              el.style.transform    = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.borderColor = 'var(--border)'
              el.style.boxShadow   = 'none'
              el.style.transform   = 'translateY(0)'
            }}
          >
            {/* Icono + chevron */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: card.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <card.icon size={20} color={card.iconColor} aria-hidden="true" />
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-secondary)', marginTop: 4 }} aria-hidden="true" />
            </div>

            {/* Texto */}
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                {card.title}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                {card.description}
              </p>
            </div>

            {/* Badge de estado */}
            {card.badge !== undefined && (
              <div style={{
                display:    'inline-flex',
                alignItems: 'center',
                gap:         4,
                padding:    '3px 8px',
                borderRadius: 6,
                background: 'var(--surface-hover)',
                fontSize:   12,
                color:      'var(--text-secondary)',
                alignSelf:  'flex-start',
              }}>
                {card.badge}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Resumen rápido de catálogos */}
      {(catCount > 0 || impCount > 0 || uniCount > 0) && (
        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 12 }}>
            {t('config.hub.catalogSummary')}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: t('config.hub.categories'), value: catCount, icon: Tag,    color: 'var(--color-warning)' },
              { label: t('config.hub.taxes'),       value: impCount, icon: Percent, color: 'var(--color-error)' },
              { label: t('config.hub.units'),        value: uniCount, icon: Ruler,   color: 'var(--color-info)' },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <item.icon size={14} color={item.color} aria-hidden="true" />
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}:</span>
                <strong style={{ color: 'var(--text)' }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
