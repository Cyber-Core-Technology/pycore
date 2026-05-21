import { useState } from 'react'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAsistencias, useResumenDia } from '@/hooks/useAsistencias'
import { useColaboradores } from '@/hooks/useColaboradores'
import { usePermissions } from '@/hooks/usePermissions'
import type { AsistenciaFiltros, TipoAsistencia, EstadoAsistencia } from '@/types/rrhh.types'
import { AsistenciaFormModal } from '../AsistenciaFormModal/AsistenciaFormModal'

const todayStr = () => new Date().toISOString().slice(0, 10)

const TIPO_KEYS: TipoAsistencia[]   = ['entrada', 'salida', 'entrada_descanso', 'salida_descanso']
const ESTADO_KEYS: EstadoAsistencia[] = ['puntual', 'retardo', 'falta', 'justificado']

const ESTADO_STYLE: Record<EstadoAsistencia, { bg: string; color: string }> = {
  puntual:    { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  retardo:    { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  falta:      { bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
  justificado:{ bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
}

function EstadoBadge({ estado }: { estado: EstadoAsistencia }) {
  const { t } = useTranslation()
  const style = ESTADO_STYLE[estado] ?? { bg: '#F3F4F6', color: '#374151' }
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: style.bg, color: style.color, whiteSpace: 'nowrap',
    }}>
      {t(`attendance.statuses.${estado}`, { defaultValue: estado })}
    </span>
  )
}

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })

const fmtHora = (h: string) => {
  if (h.includes('T')) {
    const d = new Date(h)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  return h.slice(0, 5)
}

export function AsistenciasList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  const [filtros, setFiltros] = useState<AsistenciaFiltros>({})
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const today = todayStr()

  const { data, isLoading, refetch } = useAsistencias(filtros)
  const { data: resumen } = useResumenDia(today)
  const { data: colabData } = useColaboradores()

  const colaboradores = colabData?.results ?? []
  const todos = data?.results ?? []

  const filtrados = todos.filter((a) => {
    if (filtros.tipo && a.tipo !== filtros.tipo) return false
    if (filtros.estado && a.estado !== filtros.estado) return false
    if (filtros.fecha_desde && a.fecha < filtros.fecha_desde) return false
    if (filtros.fecha_hasta && a.fecha > filtros.fecha_hasta) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.colaborador_nombre.toLowerCase().includes(q)) return false
    }
    return true
  })

  if (!hasPermission('rrhh.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('hr.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  const recordCountLabel = filtrados.length === 1
    ? `1 ${t('attendance.recordSingular')}`
    : `${filtrados.length} ${t('attendance.recordPlural')}`

  const hasFilters = !!(filtros.tipo || filtros.estado || filtros.fecha_desde || filtros.fecha_hasta || search)

  return (
    <>
      {showForm && (
        <AsistenciaFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch() }}
          colaboradores={colaboradores}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('attendance.title')}</h1>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>{recordCountLabel}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => refetch()}
              style={{ padding: 8, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
              title={t('common.refresh')}
            >
              <RefreshCw size={15} />
            </button>
            {hasPermission('rrhh.crear') && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                {t('hr.registerAttendance')}
              </button>
            )}
          </div>
        </div>

        {/* Daily summary bar */}
        {resumen && (
          <div className="card" style={{ padding: '12px 16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {t('attendance.daySummary')} — {new Date(today + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {ESTADO_KEYS.map((key) => {
                const style = ESTADO_STYLE[key]
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 14px', borderRadius: 8, background: style.bg,
                  }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: style.color }}>
                      {(resumen as unknown as Record<string, number>)[key] ?? 0}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: style.color }}>
                      {t(`attendance.statusCounts.${key}`, { defaultValue: key })}
                    </span>
                  </div>
                )
              })}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 8,
                background: 'var(--surface-hover)',
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{resumen.total}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('attendance.total')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('attendance.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)',
                }}
              />
            </div>

            <select
              value={filtros.tipo ?? ''}
              onChange={(e) => setFiltros((f) => ({ ...f, tipo: (e.target.value as TipoAsistencia) || undefined }))}
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none',
                background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer',
              }}
            >
              <option value="">{t('attendance.allTypes')}</option>
              {TIPO_KEYS.map((key) => (
                <option key={key} value={key}>{t(`attendance.types.${key}`, { defaultValue: key })}</option>
              ))}
            </select>

            <select
              value={filtros.estado ?? ''}
              onChange={(e) => setFiltros((f) => ({ ...f, estado: (e.target.value as EstadoAsistencia) || undefined }))}
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none',
                background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer',
              }}
            >
              <option value="">{t('attendance.allStatuses')}</option>
              {ESTADO_KEYS.map((key) => (
                <option key={key} value={key}>{t(`attendance.statuses.${key}`, { defaultValue: key })}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('common.dateFrom')}:</label>
              <input
                type="date"
                value={filtros.fecha_desde ?? ''}
                onChange={(e) => setFiltros((f) => ({ ...f, fecha_desde: e.target.value || undefined }))}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
                  background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('common.dateTo')}:</label>
              <input
                type="date"
                value={filtros.fecha_hasta ?? ''}
                onChange={(e) => setFiltros((f) => ({ ...f, fecha_hasta: e.target.value || undefined }))}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
                  background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)',
                }}
              />
            </div>
            {hasFilters && (
              <button
                onClick={() => { setFiltros({}); setSearch('') }}
                style={{ fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px' }}
              >
                {t('common.clearFilters')}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
              <span style={{ fontSize: 40 }}>📋</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {hasFilters ? t('common.noResults') : t('attendance.noRecords')}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    {[
                      t('attendance.columns.collaborator'),
                      t('attendance.columns.date'),
                      t('attendance.columns.time'),
                      t('attendance.columns.type'),
                      t('attendance.columns.status'),
                    ].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 16px', fontSize: 11,
                        fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((a) => (
                    <tr
                      key={a.id}
                      className="data-row"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {a.colaborador_nombre}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          #{a.colaborador_numero}
                        </p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {fmtDate(a.fecha)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {fmtHora(a.hora_registro)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {t(`attendance.types.${a.tipo}`, { defaultValue: a.tipo })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <EstadoBadge estado={a.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
