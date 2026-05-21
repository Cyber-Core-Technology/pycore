import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProductos, useStock, useMovimientos, useAlertasStock, useEliminarProducto } from '@/hooks/useInventory'
import { useAuthStore } from '@/store/authStore'
import { usePermissions } from '@/hooks/usePermissions'
import { formatMXN } from '@/utils/formatters'
import { Search, RefreshCw, Plus, AlertTriangle, Eye, Trash2, Package, BarChart2, ArrowLeftRight, ImagePlus } from 'lucide-react'
import { inventoryApi } from '@/api/inventory-api'
import type { TipoMovimiento, ProductoLight, StockItem, Movimiento } from '@/types/inventory.types'
import { ProductDetail } from '../ProductDetail/ProductDetail'
import { ProductForm }   from '../ProductForm/ProductForm'
import { AdjustModal }   from '../AdjustModal/AdjustModal'

type Tab = 'productos' | 'stock' | 'movimientos'

const TIPO_MOVIMIENTO_COLOR: Record<TipoMovimiento, { color: string; bg: string }> = {
  entrada:          { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  salida:           { color: 'var(--color-error)',   bg: 'var(--color-error-bg)'   },
  ajuste:           { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  traspaso_entrada: { color: 'var(--color-info)',    bg: 'var(--color-info-bg)'    },
  traspaso_salida:  { color: '#8B5CF6',              bg: 'rgba(139,92,246,0.12)'   },
}

function MovimientoBadge({ tipo }: { tipo: TipoMovimiento }) {
  const { t } = useTranslation()
  const labels: Record<TipoMovimiento, string> = {
    entrada:          t('inventory.movTypes.entry'),
    salida:           t('inventory.movTypes.exit'),
    ajuste:           t('inventory.movTypes.adjust'),
    traspaso_entrada: t('inventory.movTypes.transferIn'),
    traspaso_salida:  t('inventory.movTypes.transferOut'),
  }
  const cfg = TIPO_MOVIMIENTO_COLOR[tipo]
  return (
    <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
      {labels[tipo]}
    </span>
  )
}

export function InventoryList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const sucursal = useAuthStore((s) => s.sucursalActiva)

  const location   = useLocation()
  const tabFromUrl: Tab = location.pathname.includes('stock')
    ? 'stock'
    : location.pathname.includes('movimientos')
    ? 'movimientos'
    : 'productos'

  const [tab,            setTab]           = useState<Tab>(tabFromUrl)
  const [search,         setSearch]        = useState('')
  const [selectedId,     setSelectedId]    = useState<string | null>(null)
  const [showForm,       setShowForm]      = useState(false)
  const [adjustTarget,   setAdjustTarget]  = useState<StockItem | null>(null)
  const [showGenImg,     setShowGenImg]    = useState(false)
  const [soloSinImagen,  setSoloSinImagen] = useState(true)
  const [generando,      setGenerando]     = useState(false)
  const [progreso,       setProgreso]      = useState<{ status: string; total?: number; done?: number; encontradas?: number } | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: productosData, isLoading: loadingP, refetch: refetchP } = useProductos({ q: search || undefined })
  const { data: stockData,     isLoading: loadingS, refetch: refetchS } = useStock(sucursal?.id_sucursal)
  const { data: movsData,      isLoading: loadingM, refetch: refetchM } = useMovimientos()
  const { data: alertas }      = useAlertasStock()
  const eliminar = useEliminarProducto()

  const productos:   ProductoLight[] = productosData ?? []
  const stock:       StockItem[]     = stockData     ?? []
  const movimientos: Movimiento[]    = movsData      ?? []
  const numAlertas = alertas?.length ?? 0

  const productTypes: Record<string, string> = {
    producto: t('inventory.productTypes.product'),
    servicio: t('inventory.productTypes.service'),
    combo:    t('inventory.productTypes.combo'),
  }

  const refetchActual = tab === 'productos' ? refetchP : tab === 'stock' ? refetchS : refetchM

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`)) return
    await eliminar.mutateAsync(id)
  }

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  const startPolling = () => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const p = await inventoryApi.progresoImagenes()
        setProgreso(p)
        if (p.status === 'completed' || p.status === 'idle') {
          stopPolling()
          setGenerando(false)
          refetchP()
        }
      } catch { /* silencioso */ }
    }, 2500)
  }

  const handleGenerarImagenes = async () => {
    setGenerando(true)
    setProgreso(null)
    try {
      const r = await inventoryApi.generarImagenesLote({ solo_sin_imagen: soloSinImagen })
      setProgreso({ status: 'running', total: r.encolados, done: 0, encontradas: 0 })
      startPolling()
    } catch {
      setGenerando(false)
      setProgreso({ status: 'completed', total: 0, done: 0, encontradas: 0 })
    }
  }

  if (!hasPermission('inventario.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('inventory.noAccess')}</p>
      </div>
    )
  }

  return (
    <>
      {selectedId && (
        <ProductDetail id={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {showForm && (
        <ProductForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetchP() }}
        />
      )}

      {adjustTarget && (
        <AdjustModal
          stockItem={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSuccess={() => { setAdjustTarget(null); refetchS() }}
        />
      )}

      {showGenImg && createPortal(
        <>
          <div
            onClick={() => !generando && setShowGenImg(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998 }}
          />
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(440px, 92vw)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'modalEnter 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('inventory.images.title')}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('inventory.images.subtitle')}</p>
              </div>
              {!generando && (
                <button onClick={() => setShowGenImg(false)} style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--surface-hover)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
                  ✕
                </button>
              )}
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!progreso ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {t('inventory.images.description')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                      {t('inventory.images.whatToProcess')}
                    </label>
                    {([
                      { value: true,  label: t('inventory.images.onlyWithout'),  desc: t('inventory.images.onlyWithoutDesc') },
                      { value: false, label: t('inventory.images.allProducts'),  desc: t('inventory.images.allProductsDesc') },
                    ] as const).map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setSoloSinImagen(opt.value)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                          padding: '10px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                          background: soloSinImagen === opt.value ? 'rgba(24,174,145,0.08)' : 'var(--surface-hover)',
                          border: `1px solid ${soloSinImagen === opt.value ? 'var(--color-primary)' : 'var(--border)'}`,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{opt.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-hover)', lineHeight: 1.5 }}>
                    {t('inventory.images.background')}
                  </div>
                </>
              ) : progreso.status === 'running' ? (
                (() => {
                  const total = progreso.total ?? 1
                  const done  = progreso.done  ?? 0
                  const pct   = Math.round((done / total) * 100)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('inventory.images.processing')}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{done} / {total}</p>
                      </div>
                      <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-hover)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          background: 'var(--color-primary)',
                          width: `${pct}%`,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--color-success)' }}>✓ {progreso.encontradas ?? 0} {t('inventory.images.found')}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{pct}{t('inventory.images.completedPct')}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {t('inventory.images.canClose')}
                      </p>
                    </div>
                  )
                })()
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0 4px' }}>
                  <span style={{ fontSize: 40 }}>{(progreso.encontradas ?? 0) > 0 ? '🎉' : '😕'}</span>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>
                    {progreso.encontradas ?? 0} {(progreso.encontradas ?? 0) !== 1 ? t('inventory.images.imagesFound') : t('inventory.images.imageFound')}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
                    {t('inventory.images.processed', { count: progreso.total ?? 0 })}{' '}
                    {(progreso.encontradas ?? 0) === 0 && t('inventory.images.noCodes')}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              {!progreso ? (
                <>
                  <button
                    onClick={() => setShowGenImg(false)}
                    style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleGenerarImagenes}
                    disabled={generando}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: generando ? 'not-allowed' : 'pointer', opacity: generando ? 0.7 : 1 }}
                  >
                    {generando
                      ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> {t('inventory.images.queuing')}</>
                      : <><ImagePlus size={13} /> {t('inventory.images.generate')}</>
                    }
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowGenImg(false); setProgreso(null); stopPolling() }}
                  style={{ padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: progreso.status === 'completed' ? 'var(--color-primary)' : 'var(--surface-hover)', color: progreso.status === 'completed' ? 'var(--color-primary-text)' : 'var(--text-secondary)', border: progreso.status === 'completed' ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                >
                  {progreso.status === 'running' ? t('inventory.images.closeBackground') : t('common.close')}
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{t('inventory.title')}</h1>
              {numAlertas > 0 && (
                <p style={{ fontSize: 12, marginTop: 2, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={12} /> {numAlertas} {t('inventory.belowMin')}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => refetchActual()}
                title={t('common.refresh')}
                aria-label={t('common.refresh')}
                style={{ padding: 8, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
              >
                <RefreshCw size={15} />
              </button>
              {tab === 'productos' && hasPermission('inventario.crear') && (
                <>
                  <button
                    onClick={() => { setShowGenImg(true); setProgreso(null); stopPolling() }}
                    title={t('inventory.images.title')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <ImagePlus size={14} /> {t('inventory.generateImages')}
                  </button>
                  <button
                    onClick={() => setShowForm(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer' }}
                  >
                    <Plus size={14} /> {t('inventory.newProduct')}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {([
              { key: 'productos',   label: t('inventory.tabs.products'),   icon: <Package size={13} /> },
              { key: 'stock',       label: t('inventory.tabs.stock'),       icon: <BarChart2 size={13} /> },
              { key: 'movimientos', label: t('inventory.tabs.movements'),   icon: <ArrowLeftRight size={13} /> },
            ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', minWidth: 0,
                  background: tab === tb.key ? 'var(--color-primary)' : 'transparent',
                  color: tab === tb.key ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                }}
              >
                {tb.icon}{tb.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'productos' && (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('inventory.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8, borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
          </div>
        )}

        {/* ── Tab: Productos ─────────────────────────────── */}
        {tab === 'productos' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            {loadingP ? <SkeletonRows /> : productos.length === 0 ? (
              <EmptyState icon="📦" text={t('inventory.noProducts')} sub={hasPermission('inventario.crear') ? t('inventory.noProductsCreate') : ''} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                      {[
                        t('inventory.columns.products.sku'),
                        t('inventory.columns.products.name'),
                        t('inventory.columns.products.type'),
                        t('inventory.columns.products.category'),
                        t('inventory.columns.products.salePrice'),
                        t('inventory.columns.products.purchasePrice'),
                        t('inventory.columns.products.status'),
                        '',
                      ].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((p) => (
                      <tr
                        key={p.id}
                        className="data-row"
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => setSelectedId(p.id)}
                      >
                        <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.sku || p.codigo}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.nombre}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{productTypes[p.tipo] ?? p.tipo}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{p.categoria_nombre ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatMXN(Number(p.precio_venta))}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{formatMXN(Number(p.precio_compra))}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: p.activo ? 'var(--color-success-bg)' : 'rgba(156,163,175,0.15)', color: p.activo ? 'var(--color-success)' : '#9CA3AF' }}>
                            {p.activo ? t('inventory.statusActive') : t('inventory.statusInactive')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedId(p.id) }}
                              title={t('common.see')}
                              aria-label={`${t('common.see')} ${p.nombre}`}
                              style={{ padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
                            >
                              <Eye size={13} />
                            </button>
                            {hasPermission('inventario.editar') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEliminar(p.id, p.nombre) }}
                                title={t('common.delete')}
                                aria-label={`${t('common.delete')} ${p.nombre}`}
                                style={{ padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer', color: 'var(--color-error)', background: 'var(--color-error-bg)' }}
                              >
                                <Trash2 size={13} />
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
        )}

        {/* ── Tab: Stock ─────────────────────────────────── */}
        {tab === 'stock' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            {loadingS ? <SkeletonRows /> : stock.length === 0 ? (
              <EmptyState icon="📊" text={t('inventory.noStock')} sub={t('inventory.noStockSub')} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                      {[
                        t('inventory.columns.stock.product'),
                        t('inventory.columns.stock.sku'),
                        t('inventory.columns.stock.branch'),
                        t('inventory.columns.stock.available'),
                        t('inventory.columns.stock.reserved'),
                        t('inventory.columns.stock.avgCost'),
                        t('inventory.columns.stock.value'),
                        '',
                      ].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s) => (
                      <tr
                        key={s.id}
                        className="data-row"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {s.bajo_minimo && <AlertTriangle size={13} style={{ color: 'var(--color-warning)' }} />}
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{s.producto_nombre}</span>
                          </div>
                          {s.variante_nombre && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.variante_nombre}</p>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{s.producto_sku}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{s.sucursal_nombre}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: s.bajo_minimo ? 'var(--color-warning)' : 'var(--text)' }}>
                          {Number(s.stock_disponible).toLocaleString('es-MX')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                          {Number(s.stock_reservado).toLocaleString('es-MX')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{formatMXN(Number(s.costo_promedio))}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatMXN(Number(s.valor_inventario))}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {hasPermission('inventario.editar') && (
                            <button
                              onClick={() => setAdjustTarget(s)}
                              style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
                            >
                              {t('inventory.adjust')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Movimientos ───────────────────────────── */}
        {tab === 'movimientos' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            {loadingM ? <SkeletonRows /> : movimientos.length === 0 ? (
              <EmptyState icon="↕️" text={t('inventory.noMovements')} sub={t('inventory.noMovementsSub')} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                      {[
                        t('inventory.columns.movements.folio'),
                        t('inventory.columns.movements.type'),
                        t('inventory.columns.movements.product'),
                        t('inventory.columns.movements.branch'),
                        t('inventory.columns.movements.quantity'),
                        t('inventory.columns.movements.before'),
                        t('inventory.columns.movements.after'),
                        t('inventory.columns.movements.reason'),
                        t('inventory.columns.movements.date'),
                      ].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <tr
                        key={m.id}
                        className="data-row"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 600 }}>{m.folio}</td>
                        <td style={{ padding: '12px 16px' }}><MovimientoBadge tipo={m.tipo_movimiento} /></td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{m.producto_nombre}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{m.sucursal_nombre}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: m.tipo_movimiento === 'salida' || m.tipo_movimiento === 'traspaso_salida' ? 'var(--color-error)' : 'var(--color-success)' }}>
                          {(m.tipo_movimiento === 'salida' || m.tipo_movimiento === 'traspaso_salida') ? '−' : '+'}{Number(m.cantidad).toLocaleString('es-MX')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{Number(m.stock_antes).toLocaleString('es-MX')}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{Number(m.stock_despues).toLocaleString('es-MX')}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.motivo || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(m.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}

function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ height: 48, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{text}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 300 }}>{sub}</p>}
    </div>
  )
}
