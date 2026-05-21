import { useState } from 'react'
import { Plus, Search, Filter, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGastos } from '@/hooks/useGastos'
import { usePermissions } from '@/hooks/usePermissions'
import type { CategoriaGasto, GastoFiltros } from '@/types/finanzas.types'
import { GastoFormModal } from '../GastoFormModal/GastoFormModal'

const CATEGORIAS: { value: CategoriaGasto; color: string }[] = [
  { value: 'renta',         color: '#6B7280' },
  { value: 'servicios',     color: 'var(--color-info)' },
  { value: 'nomina',        color: '#8B5CF6' },
  { value: 'mantenimiento', color: 'var(--color-warning)' },
  { value: 'marketing',     color: '#EC4899' },
  { value: 'transporte',    color: '#06B6D4' },
  { value: 'impuestos',     color: 'var(--color-error)' },
  { value: 'otro',          color: '#9CA3AF' },
]

const CATEGORIA_COLOR = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.color]))

function CategoriaBadge({ categoria }: { categoria: CategoriaGasto }) {
  const { t } = useTranslation()
  const labels: Record<string, string> = {
    renta:         t('expenses.categories.rent'),
    servicios:     t('expenses.categories.services'),
    nomina:        t('expenses.categories.payroll'),
    mantenimiento: t('expenses.categories.maintenance'),
    marketing:     t('expenses.categories.marketing'),
    transporte:    t('expenses.categories.transport'),
    impuestos:     t('expenses.categories.taxes'),
    otro:          t('expenses.categories.other'),
  }
  const color = CATEGORIA_COLOR[categoria] ?? '#9CA3AF'
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: `${color}20`, color,
    }}>
      {labels[categoria] ?? categoria}
    </span>
  )
}

const fmt = (val: string | number) =>
  Number(val).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

export function GastosList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  const [filtros,     setFiltros]     = useState<GastoFiltros>({})
  const [showFiltros, setShowFiltros] = useState(false)
  const [search,      setSearch]      = useState('')
  const [showForm,    setShowForm]    = useState(false)

  const { data, isLoading, refetch } = useGastos(filtros)

  const todos = data?.results ?? []

  const categoryLabels: Record<string, string> = {
    renta:         t('expenses.categories.rent'),
    servicios:     t('expenses.categories.services'),
    nomina:        t('expenses.categories.payroll'),
    mantenimiento: t('expenses.categories.maintenance'),
    marketing:     t('expenses.categories.marketing'),
    transporte:    t('expenses.categories.transport'),
    impuestos:     t('expenses.categories.taxes'),
    otro:          t('expenses.categories.other'),
  }

  const metodoLabel: Record<string, string> = {
    efectivo:        t('expenses.paymentMethods.cash'),
    tarjeta_debito:  t('expenses.paymentMethods.debit'),
    tarjeta_credito: t('expenses.paymentMethods.credit'),
    transferencia:   t('expenses.paymentMethods.transfer'),
    cheque:          t('expenses.paymentMethods.check'),
    otro:            t('expenses.paymentMethods.other'),
  }

  // Client-side filtering
  const filtrados = todos.filter((g) => {
    if (filtros.categoria && g.categoria !== filtros.categoria) return false
    if (filtros.fecha_desde && g.fecha_gasto < filtros.fecha_desde) return false
    if (filtros.fecha_hasta && g.fecha_gasto > filtros.fecha_hasta) return false
    if (search) {
      const q = search.toLowerCase()
      if (!g.concepto.toLowerCase().includes(q) && !g.folio.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalGastos = filtrados.reduce((s, g) => s + parseFloat(g.total), 0)

  if (!hasPermission('finanzas.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('expenses.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  return (
    <>
      {showForm && (
        <GastoFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch() }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('expenses.title')}</h1>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>
              {filtrados.length} {filtrados.length !== 1 ? t('expenses.expensePlural') : t('expenses.expense')}
            </p>
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
            {hasPermission('finanzas.crear') && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                {t('expenses.newExpense')}
              </button>
            )}
          </div>
        </div>

        {/* Búsqueda + filtros */}
        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('expenses.searchPlaceholder')}
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
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('expenses.category')}</label>
                <select
                  value={filtros.categoria ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, categoria: (e.target.value as CategoriaGasto) || undefined }))}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="">{t('expenses.allCategories')}</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{categoryLabels[c.value] ?? c.value}</option>
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

              <button
                onClick={() => setFiltros({})}
                style={{ alignSelf: 'flex-end', fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
              >
                {t('common.clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
              <span style={{ fontSize: 40 }}>💸</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {search || filtros.categoria || filtros.fecha_desde || filtros.fecha_hasta
                  ? t('common.noResults')
                  : t('expenses.noExpenses')}
              </p>
              {!search && !filtros.categoria && !filtros.fecha_desde && !filtros.fecha_hasta && hasPermission('finanzas.crear') && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('expenses.addFirst')}
                </p>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    {[
                      t('expenses.columns.date'),
                      t('expenses.columns.concept'),
                      t('expenses.columns.category'),
                      t('expenses.columns.paymentMethod'),
                      t('expenses.columns.amount'),
                      t('expenses.columns.total'),
                    ].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((gasto) => (
                    <tr
                      key={gasto.id_gasto}
                      className="data-row"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{fmtDate(gasto.fecha_gasto)}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{gasto.concepto}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0', fontFamily: 'monospace' }}>{gasto.folio}</p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <CategoriaBadge categoria={gasto.categoria} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {metodoLabel[gasto.metodo_pago] ?? gasto.metodo_pago}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{fmt(gasto.monto)}</span>
                        {parseFloat(gasto.impuesto_monto) > 0 && (
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            +{fmt(gasto.impuesto_monto)} {t('expenses.tax')}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{fmt(gasto.total)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)' }}>
                    <td colSpan={5} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>
                      {t('common.total')} ({filtrados.length} {filtrados.length !== 1 ? t('expenses.expensePlural') : t('expenses.expense')})
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                      {totalGastos.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
