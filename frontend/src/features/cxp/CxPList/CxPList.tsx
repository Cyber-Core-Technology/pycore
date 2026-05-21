import { useState } from 'react'
import { Search, Filter, RefreshCw, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCxP } from '@/hooks/useCxP'
import { usePermissions } from '@/hooks/usePermissions'
import type { EstadoCxP, CxPFiltros } from '@/types/finanzas.types'
import { CxPDetailDrawer } from '../CxPDetailDrawer/CxPDetailDrawer'

const ESTADO_STYLE: Record<EstadoCxP, { bg: string; color: string }> = {
  pendiente:      { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  pagada_parcial: { bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
  pagada:         { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  vencida:        { bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
  cancelada:      { bg: 'rgba(107,114,128,0.12)', color: '#6B7280' },
}

function EstadoBadge({ estado }: { estado: EstadoCxP }) {
  const { t } = useTranslation()
  const labels: Record<EstadoCxP, string> = {
    pendiente:      t('cxp.statuses.pending'),
    pagada_parcial: t('cxp.statuses.partial'),
    pagada:         t('cxp.statuses.paid'),
    vencida:        t('cxp.statuses.overdue'),
    cancelada:      t('cxp.statuses.cancelled'),
  }
  const cfg = ESTADO_STYLE[estado] ?? { bg: 'var(--surface-hover)', color: 'var(--text-secondary)' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
      {labels[estado] ?? estado}
    </span>
  )
}

const fmt = (val: string) =>
  parseFloat(val).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

export function CxPList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  const [filtros,     setFiltros]     = useState<CxPFiltros>({})
  const [showFiltros, setShowFiltros] = useState(false)
  const [search,      setSearch]      = useState('')
  const [selectedId,  setSelectedId]  = useState<number | null>(null)

  const { data, isLoading, refetch } = useCxP(filtros)

  const todos = data?.results ?? []

  const filtrados = todos.filter((c) => {
    if (filtros.estado && c.estado !== filtros.estado) return false
    if (filtros.vencidas && !c.esta_vencida) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.nombre_proveedor.toLowerCase().includes(q) && !c.folio.toLowerCase().includes(q)) return false
    }
    return true
  })

  const vencidasCount = filtrados.filter((c) => c.esta_vencida).length

  const statusOptions: { value: EstadoCxP; label: string }[] = [
    { value: 'pendiente',      label: t('cxp.statuses.pending') },
    { value: 'pagada_parcial', label: t('cxp.statuses.partial') },
    { value: 'pagada',         label: t('cxp.statuses.paid') },
    { value: 'vencida',        label: t('cxp.statuses.overdue') },
    { value: 'cancelada',      label: t('cxp.statuses.cancelled') },
  ]

  if (!hasPermission('finanzas.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('cxp.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  return (
    <>
      {selectedId !== null && (
        <CxPDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          canCancelar={hasPermission('finanzas.crear')}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('cxp.title')}</h1>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>
              {filtrados.length} {filtrados.length !== 1 ? t('cxp.documentPlural') : t('cxp.documents')}
              {filtrados.some((c) => c.esta_vencida) && (
                <span style={{ marginLeft: 8, color: 'var(--color-error)', fontWeight: 600 }}>
                  · {vencidasCount} {vencidasCount !== 1 ? t('cxp.overdues') : t('cxp.overdue')}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            title={t('common.refresh')}
            aria-label={t('common.refresh')}
            style={{ padding: 8, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('cxp.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)',
                }}
              />
            </div>
            <button
              onClick={() => setShowFiltros(!showFiltros)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
                background: showFiltros ? 'var(--color-primary)' : 'var(--surface-hover)',
                color: showFiltros ? 'var(--color-primary-text)' : 'var(--text)',
              }}
            >
              <Filter size={14} />
              {t('common.filters')}
            </button>
          </div>

          {showFiltros && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('common.status')}</label>
                <select
                  value={filtros.estado ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, estado: (e.target.value as EstadoCxP) || undefined }))}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="">{t('cxp.allStatuses')}</option>
                  {statusOptions.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('common.dateFrom')}</label>
                <input
                  type="date"
                  value={filtros.fecha_desde ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, fecha_desde: e.target.value || undefined }))}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('common.dateTo')}</label>
                <input
                  type="date"
                  value={filtros.fecha_hasta ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, fecha_hasta: e.target.value || undefined }))}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('cxp.show')}</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filtros.vencidas ?? false}
                    onChange={(e) => setFiltros((f) => ({ ...f, vencidas: e.target.checked || undefined }))}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{t('cxp.onlyOverdue')}</span>
                </label>
              </div>

              <button
                onClick={() => setFiltros({})}
                style={{ alignSelf: 'flex-end', fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
              >
                {t('common.clearFilters')}
              </button>
            </div>
          )}
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
              <span style={{ fontSize: 40 }}>📋</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {search || filtros.estado || filtros.vencidas ? t('common.noResults') : t('cxp.noResults')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('cxp.autoGenerated')}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    {[
                      t('cxp.columns.folio'),
                      t('cxp.columns.provider'),
                      t('cxp.columns.amountBalance'),
                      t('cxp.columns.dueDate'),
                      t('cxp.columns.status'),
                      '',
                    ].map((h, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((cxp) => (
                    <tr
                      key={cxp.id_cxp}
                      className="data-row"
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setSelectedId(cxp.id_cxp)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)', fontWeight: 600 }}>{cxp.folio}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{cxp.nombre_proveedor}</span>
                        {cxp.folio_compra && (
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                            {t('cxp.purchase')} {cxp.folio_compra}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmt(cxp.monto_original)}</span>
                          {parseFloat(cxp.saldo_pendiente) > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--color-error)' }}>{t('cxp.pending')} {fmt(cxp.saldo_pendiente)}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {cxp.esta_vencida && cxp.estado !== 'pagada' && cxp.estado !== 'cancelada' && (
                            <AlertTriangle size={13} style={{ color: 'var(--color-error)' }} />
                          )}
                          <span style={{ fontSize: 13, color: cxp.esta_vencida && cxp.estado !== 'pagada' && cxp.estado !== 'cancelada' ? 'var(--color-error)' : 'var(--text)' }}>
                            {fmtDate(cxp.fecha_vencimiento)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <EstadoBadge estado={cxp.estado} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(cxp.id_cxp) }}
                          style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          {t('common.see')}
                        </button>
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
