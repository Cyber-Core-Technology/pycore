import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SalesAnalytics } from '@/features/sales/SalesAnalytics/SalesAnalytics'
import { useVentas } from '@/hooks/useSales'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/authStore'
import { formatMXN } from '@/utils/formatters'
import { Plus, Search, Filter, Eye, XCircle, RefreshCw, BarChart2 } from 'lucide-react'
import type { VentaFiltros, EstadoVenta, MetodoPago, Venta } from '@/types/sales.types'
import { SaleDetail } from '../SaleDetail/SaleDetail'
import { NewSaleModal } from '../NewSaleModal/NewSaleModal'
import { CancelModal } from '../CancelModal/CancelModal'
import { SaleSuccessModal } from '../SaleSuccessModal/SaleSuccessModal'

function EstadoBadge({ estado }: { estado: EstadoVenta }) {
  const { t } = useTranslation()
  const cfg = {
    borrador:  { label: t('sales.draft'),     bg: 'rgba(156,163,175,0.15)',  color: '#9CA3AF' },
    activo:    { label: t('sales.active'),    bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
    cancelado: { label: t('sales.cancelled'), bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
    pagado:    { label: t('sales.paid'),      bg: 'rgba(24,174,145,0.12)',   color: 'var(--color-primary)' },
  }[estado]
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

type Tab = 'lista' | 'analitica'

export function SalesList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const sucursal = useAuthStore((s) => s.sucursalActiva)
  const empresa  = useAuthStore((s) => s.usuario?.empresa)

  const METODO_LABEL: Record<string, string> = {
    efectivo:        t('sales.paymentMethods.cash'),
    tarjeta_debito:  t('sales.paymentMethods.debitCard'),
    tarjeta_credito: t('sales.paymentMethods.creditCard'),
    transferencia:   t('sales.paymentMethods.transfer'),
    cheque:          t('sales.paymentMethods.check'),
    credito:         t('sales.paymentMethods.credit'),
    otro:            t('sales.paymentMethods.other'),
  }

  const [tab,          setTab]          = useState<Tab>('lista')
  const [filtros,      setFiltros]      = useState<VentaFiltros>({})
  const [showFiltros,  setShowFiltros]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [showNewSale,  setShowNewSale]  = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Venta | null>(null)
  const [successVenta, setSuccessVenta] = useState<Venta | null>(null)

  const { data, isLoading, refetch } = useVentas({
    ...filtros,
    id_sucursal: sucursal?.id_sucursal as any,
  })

  const ventas = data?.results ?? []
  const filtradas = search
    ? ventas.filter((v) =>
        v.folio.toLowerCase().includes(search.toLowerCase())
      )
    : ventas

  // ─── Sin acceso ──────────────────────────────────────────
  if (!hasPermission('ventas.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('sales.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  return (
    <>
      {/* Modales */}
      {showNewSale && (
        <NewSaleModal
          onClose={() => setShowNewSale(false)}
          onSuccess={(venta) => { setShowNewSale(false); setSuccessVenta(venta); refetch() }}
        />
      )}
      {successVenta && empresa && (
        <SaleSuccessModal
          venta={successVenta}
          empresa={empresa}
          onClose={() => setSuccessVenta(null)}
          onNuevaVenta={() => { setSuccessVenta(null); setShowNewSale(true) }}
        />
      )}
      {cancelTarget && (
        <CancelModal
          venta={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={() => { setCancelTarget(null); refetch() }}
        />
      )}
      {selectedId && (
        <SaleDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onCancel={(v) => { setSelectedId(null); setCancelTarget(v) }}
          canCancel={hasPermission('ventas.cancelar')}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Header con tabs ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

          {/* Título + tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{t('sales.title')}</h1>
              {tab === 'lista' && (
                <p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary)' }}>
                  {data?.count ?? ventas.length} {t('sales.recordsFound')}
                </p>
              )}
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 2, padding: 3,
              borderRadius: 10, background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}>
              {([
                { key: 'lista',     label: t('sales.list'),      icon: null },
                { key: 'analitica', label: t('sales.analytics'), icon: <BarChart2 size={13} /> },
              ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((tab_item) => (
                <button
                  key={tab_item.key}
                  onClick={() => setTab(tab_item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 14px', borderRadius: 7,
                    fontSize: 13, fontWeight: 500,
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: tab === tab_item.key ? 'var(--color-primary)' : 'transparent',
                    color: tab === tab_item.key ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                  }}
                >
                  {tab_item.icon}
                  {tab_item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tab === 'lista' && (
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
            )}
            {hasPermission('ventas.crear') && (
              <button
                onClick={() => setShowNewSale(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                {t('sales.newSale')}
              </button>
            )}
          </div>
        </div>

        {/* ── Contenido por tab ───────────────────────────── */}
        {tab === 'analitica' ? (
          <SalesAnalytics />
        ) : (
          <>
            {/* Barra búsqueda + filtros */}
            <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder={t('sales.searchPlaceholder')}
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
                      onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value as EstadoVenta || undefined }))}
                      style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="activo">{t('sales.active')}</option>
                      <option value="pagado">{t('sales.paid')}</option>
                      <option value="cancelado">{t('sales.cancelled')}</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('sales.paymentMethodLabel')}</label>
                    <select
                      value={filtros.metodo_pago ?? ''}
                      onChange={(e) => setFiltros((f) => ({ ...f, metodo_pago: e.target.value as MetodoPago || undefined }))}
                      style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="efectivo">{t('sales.paymentMethods.cash')}</option>
                      <option value="tarjeta_debito">{t('sales.paymentMethods.debitCard')}</option>
                      <option value="tarjeta_credito">{t('sales.paymentMethods.creditCard')}</option>
                      <option value="transferencia">{t('sales.paymentMethods.transfer')}</option>
                      <option value="credito">{t('sales.paymentMethods.credit')}</option>
                      <option value="cheque">{t('sales.paymentMethods.check')}</option>
                      <option value="otro">{t('common.other')}</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('sales.from')}</label>
                    <input
                      type="date"
                      value={filtros.fecha_desde ?? ''}
                      onChange={(e) => setFiltros((f) => ({ ...f, fecha_desde: e.target.value || undefined }))}
                      style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('sales.to')}</label>
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
                    <div key={i} style={{ height: 48, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : filtradas.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
                  <span style={{ fontSize: 40 }}>🧾</span>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('sales.noSales')}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {hasPermission('ventas.crear') ? t('sales.createFirst') : t('sales.noSalesShow')}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                        {[t('sales.folio'), t('sales.client'), t('common.date'), t('sales.method'), t('common.total'), t('common.status'), ''].map((h) => (
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
                      {filtradas.map((venta) => (
                        <tr
                          key={String(venta.id_venta)}
                          className="data-row"
                          style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                          onClick={() => setSelectedId(String(venta.id_venta))}
                        >
                          <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>
                            {venta.folio}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>
                            {venta.id_cliente
                              ? String(venta.id_cliente)
                              : <span style={{ color: 'var(--text-secondary)' }}>{t('sales.counter')}</span>
                            }
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                            {new Date(venta.fecha_venta).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                            {METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {formatMXN(Number(venta.total))}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <EstadoBadge estado={venta.estado} />
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedId(String(venta.id_venta)) }}
                                title={t('common.see')}
                                aria-label={t('common.see')}
                                style={{
                                  padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer',
                                  color: 'var(--text-secondary)', background: 'var(--surface-hover)',
                                }}
                              >
                                <Eye size={13} />
                              </button>
                              {hasPermission('ventas.cancelar') && venta.estado === 'activo' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCancelTarget(venta) }}
                                  title={t('sales.cancelSale')}
                                  aria-label={t('sales.cancelSale')}
                                  style={{
                                    padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer',
                                    color: 'var(--color-error)', background: 'var(--color-error-bg)',
                                  }}
                                >
                                  <XCircle size={13} />
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
          </>
        )}
      </div>
    </>
  )
}