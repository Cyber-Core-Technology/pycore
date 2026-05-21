import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompras } from '@/hooks/usePurchases'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/authStore'
import { formatMXN } from '@/utils/formatters'
import { Plus, Search, Filter, Eye, RefreshCw } from 'lucide-react'
import type { EstadoCompra, MetodoPagoCompra, FiltrosCompra, CompraLight } from '@/types/purchases.types'
import { PurchaseDetail } from '../PurchaseDetail/PurchaseDetail'
import { PurchaseForm } from '../PurchaseForm/PurchaseForm'

const ESTADO_STYLE: Record<EstadoCompra, { bg: string; color: string }> = {
  borrador:         { bg: 'rgba(156,163,175,0.15)',    color: '#9CA3AF' },
  activo:           { bg: 'var(--color-info-bg)',      color: 'var(--color-info)' },
  recibida_parcial: { bg: 'var(--color-warning-bg)',   color: 'var(--color-warning)' },
  recibida:         { bg: 'var(--color-success-bg)',   color: 'var(--color-success)' },
  cancelada:        { bg: 'var(--color-error-bg)',     color: 'var(--color-error)' },
}

function EstadoBadge({ estado }: { estado: EstadoCompra }) {
  const { t } = useTranslation()
  const labels: Record<EstadoCompra, string> = {
    borrador:         t('purchases.statuses.draft'),
    activo:           t('purchases.statuses.active'),
    recibida_parcial: t('purchases.statuses.partialReceived'),
    recibida:         t('purchases.statuses.received'),
    cancelada:        t('purchases.statuses.cancelled'),
  }
  const cfg = ESTADO_STYLE[estado]
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      {labels[estado]}
    </span>
  )
}

export function PurchasesList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const sucursal = useAuthStore((s) => s.sucursalActiva)

  const [filtros,     setFiltros]     = useState<FiltrosCompra>({})
  const [showFiltros, setShowFiltros] = useState(false)
  const [search,      setSearch]      = useState('')
  const [selectedId,  setSelectedId]  = useState<number | null>(null)
  const [showForm,    setShowForm]    = useState(false)

  const metodoLabel: Record<MetodoPagoCompra, string> = {
    efectivo:        t('purchases.paymentMethods.cash'),
    tarjeta_debito:  t('purchases.paymentMethods.debit'),
    tarjeta_credito: t('purchases.paymentMethods.credit'),
    transferencia:   t('purchases.paymentMethods.transfer'),
    cheque:          t('purchases.paymentMethods.check'),
    otro:            t('purchases.paymentMethods.other'),
  }

  const { data, isLoading, refetch } = useCompras({
    ...filtros,
    id_sucursal: sucursal?.id_sucursal,
  })

  const compras: CompraLight[] = Array.isArray(data) ? data : (data as any)?.results ?? []

  const filtradas = search
    ? compras.filter((c) =>
        c.folio.toLowerCase().includes(search.toLowerCase()) ||
        c.nombre_proveedor.toLowerCase().includes(search.toLowerCase())
      )
    : compras

  if (!hasPermission('compras.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('purchases.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  return (
    <>
      {showForm && (
        <PurchaseForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch() }}
        />
      )}
      {selectedId !== null && (
        <PurchaseDetail
          idCompra={selectedId}
          onClose={() => setSelectedId(null)}
          onSuccess={() => { setSelectedId(null); refetch() }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{t('purchases.title')}</h1>
            <p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary)' }}>
              {filtradas.length} {t('purchases.recordsFound')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => refetch()}
              title={t('common.refresh')}
              aria-label={t('common.refresh')}
              style={{
                padding: 8, borderRadius: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex',
              }}
            >
              <RefreshCw size={15} />
            </button>
            {hasPermission('compras.crear') && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                {t('purchases.newPurchase')}
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('purchases.searchPlaceholder')}
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
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('common.status')}</label>
                <select
                  value={filtros.estado ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, estado: (e.target.value as EstadoCompra) || undefined }))}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="">{t('common.all')}</option>
                  <option value="borrador">{t('purchases.statuses.draft')}</option>
                  <option value="activo">{t('purchases.statuses.active')}</option>
                  <option value="recibida_parcial">{t('purchases.statuses.partialReceived')}</option>
                  <option value="recibida">{t('purchases.statuses.received')}</option>
                  <option value="cancelada">{t('purchases.statuses.cancelled')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('sales.paymentMethodLabel')}</label>
                <select
                  value={filtros.metodo_pago ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, metodo_pago: (e.target.value as MetodoPagoCompra) || undefined }))}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="">{t('common.all')}</option>
                  <option value="efectivo">{t('purchases.paymentMethods.cash')}</option>
                  <option value="tarjeta_debito">{t('purchases.paymentMethods.debit')}</option>
                  <option value="tarjeta_credito">{t('purchases.paymentMethods.credit')}</option>
                  <option value="transferencia">{t('purchases.paymentMethods.transfer')}</option>
                  <option value="cheque">{t('purchases.paymentMethods.check')}</option>
                  <option value="otro">{t('purchases.paymentMethods.other')}</option>
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

        <div className="card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 48, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
              <span style={{ fontSize: 40 }}>📦</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('purchases.noPurchases')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {hasPermission('compras.crear') ? t('purchases.createFirst') : t('purchases.noPurchasesShow')}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    {[
                      t('purchases.columns.folio'),
                      t('purchases.columns.provider'),
                      t('purchases.columns.branch'),
                      t('purchases.columns.date'),
                      t('purchases.columns.method'),
                      t('purchases.columns.total'),
                      t('purchases.columns.status'),
                      '',
                    ].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 16px',
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                        color: 'var(--text-secondary)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((compra) => (
                    <tr
                      key={compra.id_compra}
                      className="data-row"
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setSelectedId(compra.id_compra)}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>
                        {compra.folio}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>
                        {compra.nombre_proveedor}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {compra.nombre_sucursal}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(compra.fecha_compra + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {compra.metodo_pago ? metodoLabel[compra.metodo_pago] : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {formatMXN(Number(compra.total))}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <EstadoBadge estado={compra.estado} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(compra.id_compra) }}
                          title={t('common.see')}
                          aria-label={t('common.see')}
                          style={{
                            padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer',
                            color: 'var(--text-secondary)', background: 'var(--surface-hover)',
                          }}
                        >
                          <Eye size={13} />
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
