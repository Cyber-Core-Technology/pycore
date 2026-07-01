import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { auditoriaApi } from '@/api/auditoria-api'
import { wsClient } from '@/services/websocket'
import { Search, RefreshCw, Filter, X, Zap, Clock } from 'lucide-react'
import type { AuditoriaFiltros, LogAuditoria } from '@/types/audit.types'

const ACCION_VALUES = [
  '',
  'venta.creada',
  'venta.cancelada',
  'venta.pagada',
  'devolucion.creada',
  'compra.creada',
  'compra.recibida',
  'compra.cancelada',
  'stock.bajo',
  'movimiento.creado',
  'producto.creado',
  'producto.actualizado',
  'cuenta_cobrar.creada',
  'cuenta_cobrar.pagada',
  'cuenta_cobrar.cancelada',
  'cuenta_cobrar.vencida',
  'cuenta_pagar.creada',
  'cuenta_pagar.pagada',
  'cuenta_pagar.cancelada',
  'pago.registrado',
  'gasto.registrado',
  'usuario.creado',
  'usuario.login',
  'usuario.logout',
  'usuario.bloqueado',
  'colaborador.creado',
  'asistencia.registrada',
  'registro.creado',
  'registro.actualizado',
  'registro.eliminado',
]

const ACCION_COLOR: Record<string, { bg: string; color: string }> = {
  'venta.creada':         { bg: 'rgba(24,174,145,0.12)',   color: '#18AE91' },
  'venta.cancelada':      { bg: 'rgba(239,68,68,0.12)',    color: '#EF4444' },
  'venta.pagada':         { bg: 'rgba(34,197,94,0.12)',    color: '#22C55E' },
  'compra.creada':        { bg: 'rgba(59,130,246,0.12)',   color: '#3B82F6' },
  'compra.recibida':      { bg: 'rgba(34,197,94,0.12)',    color: '#22C55E' },
  'compra.cancelada':     { bg: 'rgba(239,68,68,0.12)',    color: '#EF4444' },
  'stock.bajo':           { bg: 'rgba(245,158,11,0.12)',   color: '#F59E0B' },
  'usuario.login':        { bg: 'rgba(24,174,145,0.08)',   color: '#18AE91' },
  'usuario.logout':       { bg: 'rgba(107,114,128,0.12)',  color: '#9CA3AF' },
  'usuario.bloqueado':    { bg: 'rgba(239,68,68,0.12)',    color: '#EF4444' },
  'usuario.creado':       { bg: 'rgba(59,130,246,0.12)',   color: '#3B82F6' },
  'producto.creado':      { bg: 'rgba(59,130,246,0.12)',   color: '#3B82F6' },
  'producto.actualizado': { bg: 'rgba(59,130,246,0.12)',   color: '#3B82F6' },
  'cuenta_cobrar.cancelada': { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  'cuenta_cobrar.vencida':   { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  'cuenta_pagar.cancelada':  { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  'gasto.registrado':     { bg: 'rgba(234,179,8,0.12)',    color: '#EAB308' },
  'registro.creado':      { bg: 'rgba(59,130,246,0.12)',   color: '#3B82F6' },
  'registro.actualizado': { bg: 'rgba(59,130,246,0.12)',   color: '#3B82F6' },
  'registro.eliminado':   { bg: 'rgba(239,68,68,0.12)',    color: '#EF4444' },
}

interface LiveEvent {
  id:      string
  event:   string
  payload: Record<string, unknown>
  ts:      string
}

function AccionBadge({ accion, label }: { accion: string; label: string }) {
  const s = ACCION_COLOR[accion] ?? { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF' }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function AuditoriaGlobalPage() {
  const { t } = useTranslation()
  const [filtros, setFiltros]         = useState<AuditoriaFiltros>({})
  const [page, setPage]               = useState(1)
  const [showFiltros, setShowFiltros] = useState(false)
  const [liveEvents, setLiveEvents]   = useState<LiveEvent[]>([])
  const [newCount, setNewCount]       = useState(0)
  const newCountRef                   = useRef(0)
  const liveRef                       = useRef<HTMLDivElement>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['auditoria-global', filtros, page],
    queryFn: () => auditoriaApi.listar({ ...filtros, page }),
    staleTime: 0,
  })

  // Feed de tiempo real vía WebSocket
  useEffect(() => {
    const handleEvent = (eventName: string) => (payload: unknown) => {
      const entry: LiveEvent = {
        id:      crypto.randomUUID(),
        event:   eventName,
        payload: payload as Record<string, unknown>,
        ts:      new Date().toISOString(),
      }
      setLiveEvents((prev) => [entry, ...prev].slice(0, 50))
      newCountRef.current += 1
      setNewCount(newCountRef.current)
    }

    const unsubs = ACCION_VALUES.slice(1).map((accion) =>
      wsClient.on(accion, handleEvent(accion))
    )
    return () => unsubs.forEach((u) => u())
  }, [])

  // Auto-scroll del feed
  useEffect(() => {
    if (liveRef.current && liveEvents.length > 0) {
      liveRef.current.scrollTop = 0
    }
  }, [liveEvents])

  const handleRefresh = useCallback(() => {
    newCountRef.current = 0
    setNewCount(0)
    refetch()
  }, [refetch])

  const handleFiltroChange = (key: keyof AuditoriaFiltros, value: string) => {
    setFiltros((f) => ({ ...f, [key]: value || undefined }))
    setPage(1)
  }

  const clearFiltros = () => {
    setFiltros({})
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.count / 20) : 1
  const logs: LogAuditoria[] = data?.results ?? []

  const accionLabel = (accion: string) => {
    const key = accion === '' ? 'todas' : accion.replace(/\./g, '_').replace(/-/g, '_')
    const translated = t(`auditoriaGlobal.acciones.${key}`, { defaultValue: '' })
    return translated !== '' ? translated : accion
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {t('auditoriaGlobal.title')}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          {t('auditoriaGlobal.subtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Panel principal: tabla */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Buscar por empresa */}
            <div style={{ position: 'relative', flex: '1', minWidth: 160 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                placeholder={t('auditoriaGlobal.searchPlaceholder')}
                value={filtros.usuario_email ?? ''}
                onChange={(e) => handleFiltroChange('usuario_email', e.target.value)}
                style={{
                  width: '100%', padding: '7px 8px 7px 26px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text)', fontSize: 13,
                }}
              />
            </div>
            <button
              onClick={() => setShowFiltros(!showFiltros)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
              }}
            >
              <Filter size={13} /> {t('auditoriaGlobal.filters')}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: newCount > 0 ? '#F59E0B' : 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                opacity: isFetching ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
              {newCount > 0 ? t('auditoriaGlobal.newEvents', { count: newCount }) : t('auditoriaGlobal.refresh')}
            </button>
          </div>

          {/* Filtros avanzados */}
          {showFiltros && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10,
              padding: 14, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('auditoriaGlobal.filterAccion')}</label>
                <select
                  value={filtros.accion ?? ''}
                  onChange={(e) => handleFiltroChange('accion', e.target.value)}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
                >
                  {ACCION_VALUES.map((val) => {
                    const key = val === '' ? 'todas' : val.replace(/\./g, '_').replace(/-/g, '_')
                    return (
                      <option key={val} value={val}>{t(`auditoriaGlobal.acciones.${key}`, { defaultValue: val })}</option>
                    )
                  })}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('auditoriaGlobal.filterDesde')}</label>
                <input
                  type="date" value={filtros.fecha_desde ?? ''}
                  onChange={(e) => handleFiltroChange('fecha_desde', e.target.value)}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('auditoriaGlobal.filterHasta')}</label>
                <input
                  type="date" value={filtros.fecha_hasta ?? ''}
                  onChange={(e) => handleFiltroChange('fecha_hasta', e.target.value)}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={clearFiltros}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
                >
                  <X size={12} /> {t('auditoriaGlobal.clearFilters')}
                </button>
              </div>
            </div>
          )}

          {/* Tabla */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[
                      t('auditoriaGlobal.colFecha'),
                      t('auditoriaGlobal.colEmpresa'),
                      t('auditoriaGlobal.colAccion'),
                      t('auditoriaGlobal.colTabla'),
                      t('auditoriaGlobal.colUsuario'),
                      t('auditoriaGlobal.colIp'),
                    ].map((h) => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                        {t('auditoriaGlobal.loading')}
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                        {t('auditoriaGlobal.noRecords')}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 12 }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>
                            {log.empresa_nombre || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <AccionBadge accion={log.accion} label={log.accion_display} />
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)', fontSize: 12 }}>
                          {log.tabla || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)', fontSize: 12 }}>
                          {log.usuario_email || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                          {log.ip_address || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {data && data.count > 20 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('auditoriaGlobal.totalRecords', { count: data.count })}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', opacity: !data.previous ? 0.4 : 1 }}
                  >
                    ←
                  </button>
                  <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--text)' }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.next}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', opacity: !data.next ? 0.4 : 1 }}
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral: eventos en tiempo real */}
        <div style={{
          background: 'var(--surface)', borderRadius: 12,
          border: '1px solid var(--border)', overflow: 'hidden',
          position: 'sticky', top: 20,
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
                boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {t('auditoriaGlobal.liveTitle')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={12} style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {t('auditoriaGlobal.liveEvents', { count: liveEvents.length })}
              </span>
            </div>
          </div>

          <div
            ref={liveRef}
            style={{
              maxHeight: 520, overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {liveEvents.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Clock size={24} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  {t('auditoriaGlobal.waitingEvents')}
                </p>
              </div>
            ) : (
              liveEvents.map((ev) => {
                const s = ACCION_COLOR[ev.event] ?? { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF' }
                const empresaNombre = (ev.payload.empresa_nombre as string) ?? ''
                return (
                  <div
                    key={ev.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{
                        padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                        background: s.bg, color: s.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140,
                      }}>
                        {accionLabel(ev.event)}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatTime(ev.ts)}
                      </span>
                    </div>
                    {empresaNombre && (
                      <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 500 }}>
                        {empresaNombre}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {liveEvents.length > 0 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setLiveEvents([])}
                style={{
                  fontSize: 11, color: 'var(--text-secondary)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                {t('auditoriaGlobal.clearFeed')}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
