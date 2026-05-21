import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { auditoriaApi } from '@/api/auditoria-api'
import { wsClient } from '@/services/websocket'
import { Search, RefreshCw, Filter, X, Activity } from 'lucide-react'
import type { AuditoriaFiltros, LogAuditoria } from '@/types/audit.types'

const ACCION_KEYS = [
  'venta.creada', 'venta.cancelada', 'venta.pagada', 'devolucion.creada',
  'compra.creada', 'compra.recibida', 'compra.cancelada', 'stock.bajo',
  'movimiento.creado', 'cuenta_cobrar.creada', 'cuenta_cobrar.pagada',
  'cuenta_pagar.creada', 'cuenta_pagar.pagada', 'pago.registrado',
  'usuario.creado', 'usuario.login', 'usuario.logout', 'usuario.bloqueado',
  'colaborador.creado', 'asistencia.registrada',
]

const ACCION_COLOR: Record<string, { bg: string; color: string }> = {
  'venta.creada':         { bg: 'rgba(24,174,145,0.12)',   color: 'var(--color-primary)' },
  'venta.cancelada':      { bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
  'venta.pagada':         { bg: 'rgba(34,197,94,0.12)',    color: '#22C55E' },
  'compra.creada':        { bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
  'compra.recibida':      { bg: 'rgba(34,197,94,0.12)',    color: '#22C55E' },
  'compra.cancelada':     { bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
  'stock.bajo':           { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  'usuario.login':        { bg: 'rgba(24,174,145,0.08)',   color: 'var(--color-primary)' },
  'usuario.logout':       { bg: 'rgba(107,114,128,0.12)',  color: '#9CA3AF' },
  'usuario.bloqueado':    { bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
  'usuario.creado':       { bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
}

function AccionBadge({ accion, label }: { accion: string; label: string }) {
  const style = ACCION_COLOR[accion] ?? { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF' }
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: style.bg, color: style.color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function AuditoriaPage() {
  const { t } = useTranslation()
  const [filtros, setFiltros]         = useState<AuditoriaFiltros>({})
  const [page, setPage]               = useState(1)
  const [showFiltros, setShowFiltros] = useState(false)
  const [emailSearch, setEmailSearch] = useState('')
  const [newCount, setNewCount]       = useState(0)
  const newCountRef = useRef(0)

  const queryKey = ['auditoria', filtros, page]

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => auditoriaApi.listar({ ...filtros, page }),
    staleTime: 0,
  })

  useEffect(() => {
    const handleEvent = () => {
      newCountRef.current += 1
      setNewCount(newCountRef.current)
    }
    const unsubs = ACCION_KEYS.map((accion) => wsClient.on(accion, handleEvent))
    return () => unsubs.forEach((u) => u())
  }, [])

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
    setEmailSearch('')
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.count / 20) : 1
  const logs: LogAuditoria[] = data?.results ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {t('audit.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
            {t('audit.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowFiltros(!showFiltros)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
            }}
          >
            <Filter size={14} />
            {t('common.filters')}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
              opacity: isFetching ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Banner nuevos eventos */}
      {newCount > 0 && (
        <div
          onClick={handleRefresh}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(24,174,145,0.1)', border: '1px solid rgba(24,174,145,0.25)',
            color: 'var(--color-primary)', fontSize: 13, fontWeight: 500,
          }}
        >
          <Activity size={15} />
          {t('audit.newEvents', { count: newCount, s: newCount > 1 ? 's' : '', ss: newCount > 1 ? 's' : '' })}
        </div>
      )}

      {/* Filtros */}
      {showFiltros && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12,
          padding: 16, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)',
        }}>
          {/* Buscar por email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {t('audit.emailUser')}
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                value={emailSearch}
                onChange={(e) => {
                  setEmailSearch(e.target.value)
                  handleFiltroChange('usuario_email', e.target.value)
                }}
                placeholder="usuario@empresa.com"
                style={{
                  width: '100%', padding: '6px 8px 6px 26px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Accion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {t('audit.actionLabel')}
            </label>
            <select
              value={filtros.accion ?? ''}
              onChange={(e) => handleFiltroChange('accion', e.target.value)}
              style={{
                padding: '6px 8px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 13,
              }}
            >
              <option value="">{t('audit.allActions')}</option>
              {ACCION_KEYS.map((key) => (
                <option key={key} value={key}>{t(`audit.actions.${key}`, { defaultValue: key })}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {t('common.dateFrom').toUpperCase()}
            </label>
            <input
              type="date"
              value={filtros.fecha_desde ?? ''}
              onChange={(e) => handleFiltroChange('fecha_desde', e.target.value)}
              style={{
                padding: '6px 8px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {t('common.dateTo').toUpperCase()}
            </label>
            <input
              type="date"
              value={filtros.fecha_hasta ?? ''}
              onChange={(e) => handleFiltroChange('fecha_hasta', e.target.value)}
              style={{
                padding: '6px 8px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={clearFiltros}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
              }}
            >
              <X size={12} /> {t('audit.clear')}
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  t('audit.columns.date'),
                  t('audit.columns.action'),
                  t('audit.columns.table'),
                  t('audit.columns.recordId'),
                  t('audit.columns.user'),
                  t('audit.columns.ip'),
                ].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: 'var(--text-secondary)',
                    letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    {t('audit.noRecords')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <AccionBadge accion={log.accion} label={log.accion_display} />
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text)' }}>
                      {log.tabla || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                      {log.id_registro || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text)' }}>
                      {log.usuario_email || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data && data.count > 20 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('audit.totalRecords', { count: data.count })}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                  opacity: !data.previous ? 0.4 : 1,
                }}
              >
                ←
              </button>
              <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--text)' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.next}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                  opacity: !data.next ? 0.4 : 1,
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
