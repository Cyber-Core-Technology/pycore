import { useState } from 'react'
import { Plus, Search, RefreshCw, Eye, Edit2, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useColaboradores } from '@/hooks/useColaboradores'
import { usePermissions } from '@/hooks/usePermissions'
import type { EstadoColaborador, Colaborador, ColaboradorFiltros } from '@/types/rrhh.types'
import { ColaboradorFormModal } from '../ColaboradorFormModal/ColaboradorFormModal'
import { ColaboradorDetailDrawer } from '../ColaboradorDetailDrawer/ColaboradorDetailDrawer'

const ESTADO_COLORS: Record<EstadoColaborador, { bg: string; color: string }> = {
  activo:      { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  baja:        { bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
  vacaciones:  { bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
  incapacidad: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
}

const ESTADO_KEYS: EstadoColaborador[] = ['activo', 'baja', 'vacaciones', 'incapacidad']

function EstadoBadge({ estado }: { estado: EstadoColaborador }) {
  const { t } = useTranslation()
  const cfg = ESTADO_COLORS[estado] ?? { bg: '#F3F4F6', color: '#374151' }
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {t(`hr.statuses.${estado}`, { defaultValue: estado })}
    </span>
  )
}

export function ColaboradoresList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  const [filtros, setFiltros] = useState<ColaboradorFiltros>({})
  const [search, setSearch] = useState('')

  const [showForm, setShowForm]                   = useState(false)
  const [editColaborador, setEditColaborador]     = useState<Colaborador | null>(null)
  const [detailId, setDetailId]                   = useState<string | null>(null)

  const { data, isLoading, refetch } = useColaboradores(filtros)

  const todos = data?.results ?? []

  const filtrados = todos.filter((c) => {
    if (filtros.estado && c.estado !== filtros.estado) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.nombre_completo.toLowerCase().includes(q) && !c.numero_empleado.toLowerCase().includes(q)) return false
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

  const foundLabel = filtrados.length === 1
    ? `1 ${t('hr.foundSingular')}`
    : `${filtrados.length} ${t('hr.foundPlural')}`

  return (
    <>
      {(showForm || editColaborador) && (
        <ColaboradorFormModal
          colaborador={editColaborador}
          onClose={() => { setShowForm(false); setEditColaborador(null) }}
          onSuccess={() => { setShowForm(false); setEditColaborador(null); refetch() }}
        />
      )}

      {detailId && (
        <ColaboradorDetailDrawer
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(c) => {
            setDetailId(null)
            setEditColaborador(c)
          }}
          canEdit={hasPermission('rrhh.editar')}
          canDarBaja={hasPermission('rrhh.editar')}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('hr.collaborators')}</h1>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>{foundLabel}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => refetch()}
              title={t('common.refresh')}
              aria-label={t('common.refresh')}
              style={{ padding: 8, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
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
                {t('hr.newCollaborator')}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder={t('hr.searchPlaceholder')}
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
            value={filtros.estado ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, estado: (e.target.value as EstadoColaborador) || undefined }))}
            style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none',
              background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <option value="">{t('hr.allStatuses')}</option>
            {ESTADO_KEYS.map((key) => (
              <option key={key} value={key}>{t(`hr.statuses.${key}`, { defaultValue: key })}</option>
            ))}
          </select>

          {(filtros.estado || search) && (
            <button
              onClick={() => { setFiltros({}); setSearch('') }}
              style={{ fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', whiteSpace: 'nowrap' }}
            >
              {t('common.clearFilters')}
            </button>
          )}
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
              <span style={{ fontSize: 40 }}>👥</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {search || filtros.estado ? t('common.noResults') : t('hr.noCollaborators')}
              </p>
              {!search && !filtros.estado && hasPermission('rrhh.crear') && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('hr.addFirstCollaborator')}
                </p>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    {[
                      t('hr.columns.collaborator'),
                      t('hr.columns.position'),
                      t('hr.columns.department'),
                      t('hr.columns.status'),
                      '',
                    ].map((h, i) => (
                      <th key={i} style={{
                        textAlign: 'left', padding: '10px 16px', fontSize: 11,
                        fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((col) => (
                    <tr
                      key={col.id}
                      className="data-row"
                      onClick={() => setDetailId(col.id)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                              {col.nombre_completo}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              #{col.numero_empleado}
                            </p>
                          </div>
                          {col.tiene_usuario && (
                            <ShieldCheck
                              size={14}
                              aria-label={t('hr.hasAccess')}
                              style={{ color: 'var(--color-success)', flexShrink: 0 }}
                            />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>
                        {col.puesto}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {col.departamento || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <EstadoBadge estado={col.estado} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setDetailId(col.id)}
                            title={t('hr.viewDetail')}
                            aria-label={`${t('hr.viewDetail')} ${col.nombre_completo}`}
                            style={{
                              padding: 6, borderRadius: 6, background: 'var(--surface-hover)',
                              border: '1px solid var(--border)', color: 'var(--text-secondary)',
                              cursor: 'pointer', display: 'flex',
                            }}
                          >
                            <Eye size={13} />
                          </button>
                          {hasPermission('rrhh.editar') && (
                            <button
                              onClick={() => setDetailId(col.id)}
                              title={t('common.edit')}
                              aria-label={`${t('common.edit')} ${col.nombre_completo}`}
                              style={{
                                padding: 6, borderRadius: 6, background: 'var(--surface-hover)',
                                border: '1px solid var(--border)', color: 'var(--text-secondary)',
                                cursor: 'pointer', display: 'flex',
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                        </div>
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
