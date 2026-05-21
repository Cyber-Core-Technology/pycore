import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Award, Megaphone, Info, CheckCheck, X, ArrowLeft } from 'lucide-react'
import { useNotificaciones } from '@/hooks/useNotificaciones'
import type { Notificacion } from '@/api/notificaciones-api'

function tiempoRelativo(iso: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('notifications.now')
  if (m < 60) return t('notifications.minutesAgo', { n: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('notifications.hoursAgo', { n: h })
  const d = Math.floor(h / 24)
  if (d < 7) return t('notifications.daysAgo', { n: d })
  const lang = document.documentElement.lang || 'es'
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short' })
}

function IconoNotif({ tipo, icono, size = 18 }: { tipo: Notificacion['tipo']; icono: string; size?: number }) {
  if (icono.length <= 2 && /\p{Emoji}/u.test(icono)) {
    return <span style={{ fontSize: size + 2 }}>{icono}</span>
  }
  if (tipo === 'tezca_insignia') return <Award size={size} style={{ color: 'var(--color-warning)' }} />
  if (tipo === 'admin_mensaje')  return <Megaphone size={size} style={{ color: '#60A5FA' }} />
  return <Info size={size} style={{ color: 'var(--color-primary)' }} />
}

function NotifDetailModal({ notif, onClose }: { notif: Notificacion; onClose: () => void }) {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX'
  const fechaCompleta = new Date(notif.created_at).toLocaleString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const tipoLabel = notif.tipo === 'tezca_insignia'
    ? t('notifications.badge')
    : notif.tipo === 'admin_mensaje'
      ? t('notifications.teamMessage')
      : t('notifications.system')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--surface)',
          borderRadius: 18,
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-hover)', border: 'none', cursor: 'pointer',
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {t('notifications.notification')}
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: notif.tipo === 'tezca_insignia'
                ? 'rgba(245,158,11,0.1)'
                : notif.tipo === 'admin_mensaje'
                  ? 'rgba(96,165,250,0.1)'
                  : 'rgba(24,174,145,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconoNotif tipo={notif.tipo} icono={notif.icono} size={24} />
            </div>
            <div>
              <span style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: notif.tipo === 'tezca_insignia' ? 'var(--color-warning)'
                     : notif.tipo === 'admin_mensaje'  ? '#60A5FA'
                     : 'var(--color-primary)',
              }}>
                {tipoLabel}
              </span>
              {notif.remitente_nombre && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {t('notifications.from')} {notif.remitente_nombre}
                </p>
              )}
            </div>
          </div>

          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
            {notif.titulo}
          </h3>

          <p style={{
            fontSize: 14, color: 'var(--text-secondary)',
            lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap',
          }}>
            {notif.mensaje}
          </p>

          <p style={{ fontSize: 12, color: 'var(--text-disabled)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            {fechaCompleta.charAt(0).toUpperCase() + fechaCompleta.slice(1)}
          </p>
        </div>
      </div>
    </div>
  )
}

export function NotificacionesDropdown() {
  const { t } = useTranslation()
  const [open,     setOpen]     = useState(false)
  const [selected, setSelected] = useState<Notificacion | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const { items, unread, loading, marcarLeida, marcarTodasLeidas } = useNotificaciones()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClickNotif = (n: Notificacion) => {
    setSelected(n)
    marcarLeida(n.id)
  }

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative p-2 rounded-lg transition-colors"
          style={{
            background: open ? 'var(--surface-hover)' : 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          title={t('notifications.title')}
        >
          <Bell size={17} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              minWidth: 16, height: 16, borderRadius: 8,
              background: 'var(--color-error)', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, padding: '0 3px',
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="notif-dropdown">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 10px', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                  {t('notifications.title')}
                </span>
                {unread > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                    background: 'var(--color-error-bg)', color: 'var(--color-error)',
                  }}>
                    {unread} {t('notifications.new')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {unread > 0 && (
                  <button
                    onClick={marcarTodasLeidas}
                    title={t('notifications.markAllRead')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                  >
                    <CheckCheck size={15} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading && items.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  {t('notifications.loading')}
                </div>
              ) : items.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <Bell size={28} style={{ color: 'var(--text-disabled)', margin: '0 auto 8px' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('notifications.empty')}</p>
                </div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotif(n)}
                    style={{
                      width: '100%', display: 'flex', gap: 12, padding: '12px 16px',
                      background: n.leida ? 'transparent' : 'rgba(24,174,145,0.05)',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = n.leida
                        ? 'var(--surface-hover)'
                        : 'rgba(24,174,145,0.10)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = n.leida
                        ? 'transparent'
                        : 'rgba(24,174,145,0.05)'
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: 'var(--bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <IconoNotif tipo={n.tipo} icono={n.icono} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <p style={{
                          fontSize: 13, fontWeight: n.leida ? 500 : 700,
                          color: 'var(--text)', margin: 0, lineHeight: 1.3,
                        }}>
                          {n.titulo}
                        </p>
                        <span style={{ fontSize: 11, color: 'var(--text-disabled)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {tiempoRelativo(n.created_at, t)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0',
                        lineHeight: 1.4,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {n.mensaje}
                      </p>
                    </div>

                    {!n.leida && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--color-primary)', flexShrink: 0, marginTop: 5,
                      }} />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <NotifDetailModal
          notif={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
