import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Palette, Check, Lock, Loader2, ArrowLeft, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { coreApi }     from '@/api/core-api'
import { PALETTES_LIST, applyTheme } from '@/lib/themes'
import { ROUTES } from '@/router/routes'

const PLAN_CON_TEMAS = new Set(['empresarial', 'elite'])

export function PersonalizacionPage() {
  const { t }       = useTranslation()
  const navigate    = useNavigate()
  const usuario     = useAuthStore((s) => s.usuario)
  const setUsuario  = useAuthStore((s) => s.setUsuario)
  const plan        = usuario?.empresa?.plan ?? ''
  const canCustomize = PLAN_CON_TEMAS.has(plan)
  const activeKey   = usuario?.empresa?.theme_key ?? 'esmeralda'

  const [preview, setPreview] = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (key: string) => coreApi.tema.actualizar(key),
    onSuccess: (data) => {
      // Actualizar store para persistir en todas las pestañas/recargas
      if (usuario && usuario.empresa) {
        setUsuario({
          ...usuario,
          empresa: { ...usuario.empresa, theme_key: data.theme_key },
        })
      }
      applyTheme(data.theme_key)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      queryClient.invalidateQueries({ queryKey: ['empresa-config'] })
    },
  })

  const handleSelect = (key: string) => {
    if (!canCustomize || mutation.isPending) return
    mutation.mutate(key)
  }

  const handleHover = (key: string | null) => {
    if (!canCustomize) return
    if (key) {
      applyTheme(key)
      setPreview(key)
    } else {
      applyTheme(activeKey)
      setPreview(null)
    }
  }

  const displayKey = mutation.isPending
    ? (mutation.variables as string)
    : (preview ?? activeKey)

  return (
    <main style={{ padding: '20px 0 60px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button
          onClick={() => navigate(ROUTES.CONFIGURACION)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Palette size={18} color="#8B5CF6" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {t('config.personalization.title')}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {t('config.personalization.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Badge de plan requerido */}
      {!canCustomize && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px', borderRadius: 10, marginBottom: 28, marginTop: 16,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
        }}>
          <Lock size={16} color="var(--color-warning)" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-warning)', margin: 0 }}>
              {t('config.personalization.exclusiveFeature')}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {t('config.personalization.planWarning', { plan: plan || t('config.personalization.noPlan') })}
            </p>
          </div>
          <button
            onClick={() => navigate(ROUTES.CONFIGURACION_SUSCRIPCION)}
            style={{
              marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--color-warning)', color: '#1C0F00', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            }}
          >
            <Sparkles size={12} /> {t('config.personalization.upgradePlan')}
          </button>
        </div>
      )}

      {/* Feedback de guardado */}
      {saved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 8, marginBottom: 20,
          background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
          color: 'var(--color-success)', fontSize: 14, fontWeight: 500,
        }}>
          <Check size={16} />
          {t('config.personalization.savedSuccess')}
        </div>
      )}

      {mutation.isError && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 20,
          background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)',
          color: 'var(--color-error)', fontSize: 14,
        }}>
          {(mutation.error as any)?.response?.data?.detail ?? t('config.personalization.saveError')}
        </div>
      )}

      {/* Grid de paletas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px,100%), 1fr))',
        gap: 14,
        marginTop: canCustomize ? 20 : 0,
      }}>
        {PALETTES_LIST.map((palette) => {
          const isActive  = palette.key === activeKey
          const isPending = mutation.isPending && mutation.variables === palette.key
          const isDisplay = palette.key === displayKey

          return (
            <button
              key={palette.key}
              onClick={() => handleSelect(palette.key)}
              onMouseEnter={() => handleHover(palette.key)}
              onMouseLeave={() => handleHover(null)}
              disabled={!canCustomize || mutation.isPending}
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                padding: '16px 16px 14px',
                background: 'var(--surface)',
                border: `2px solid ${isActive ? palette.primary : isDisplay ? `${palette.primary}60` : 'var(--border)'}`,
                borderRadius: 12,
                cursor: canCustomize && !mutation.isPending ? 'pointer' : 'default',
                textAlign: 'left',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: isActive ? `0 0 0 3px ${palette.primary}22` : 'none',
                opacity: !canCustomize && !isActive ? 0.75 : 1,
                position: 'relative',
              }}
            >
              {/* Swatches de colores */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: palette.primary,
                  flexShrink: 0,
                  boxShadow: `0 2px 8px ${palette.primary}50`,
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      palette.vars.light['--sidebar-bg'],
                      palette.vars.light['--surface-hover'],
                      palette.vars.light['--color-accent'],
                    ].map((color, i) => (
                      <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: color }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      palette.vars.dark['--bg'],
                      palette.vars.dark['--surface'],
                      palette.vars.dark['--surface-hover'],
                    ].map((color, i) => (
                      <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: color }} />
                    ))}
                  </div>
                </div>

                {/* Indicador activo / cargando */}
                {isPending ? (
                  <Loader2 size={16} style={{ color: palette.primary, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                ) : isActive ? (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: palette.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} color={palette.vars.light['--color-primary-text']} strokeWidth={3} />
                  </div>
                ) : null}
              </div>

              {/* Texto */}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {palette.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {palette.description}
                </p>
              </div>

              {/* Hex del color primario */}
              <code style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 6,
                background: 'var(--surface-hover)',
                color: 'var(--text-secondary)',
                alignSelf: 'flex-start',
                fontFamily: 'monospace',
              }}>
                {palette.primary}
              </code>

              {/* Lock overlay para planes sin acceso */}
              {!canCustomize && !isActive && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  padding: '2px 6px', borderRadius: 6,
                  background: 'rgba(245,158,11,0.12)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <Lock size={10} color="var(--color-warning)" />
                  <span style={{ fontSize: 10, color: 'var(--color-warning)', fontWeight: 600 }}>PRO</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Nota de propagación */}
      {canCustomize && (
        <p style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 24, textAlign: 'center' }}>
          {t('config.personalization.propagationNote')}
        </p>
      )}
    </main>
  )
}
