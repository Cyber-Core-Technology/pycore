import { useState, useCallback, useEffect } from 'react'
import { Search, RefreshCw, FileSpreadsheet, FileText, Download, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios-config'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/authStore'
import { previewPDF, exportToExcel } from '@/utils/exportUtils'
import { fetchAllVentas, fetchAllCompras, fetchAllGastos } from '@/api/reports-api'
import type { VentaItem, CompraItem, GastoItem } from '@/api/reports-api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val: string | number | undefined | null) =>
  Number(val ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const fmtDate = (d?: string | null) => {
  if (!d) return '—'
  const s = d.includes('T') ? d : d + 'T12:00:00'
  return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const firstDayOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const todayStr = () => dateStr(new Date())

const extractResults = <T,>(data: T[] | { count?: number; results?: T[] }): T[] =>
  Array.isArray(data) ? data : (data?.results ?? [])

const ESTADO_COLOR: Record<string, string> = {
  completada: '#16a34a', recibida: '#16a34a',
  pendiente: '#d97706', parcial: '#d97706', borrador: '#6b7280',
  cancelada: '#dc2626',
}

const CATEGORIA_COLORS: Record<string, string> = {
  renta: '#6B7280', servicios: 'var(--color-info)', nomina: '#8B5CF6',
  mantenimiento: 'var(--color-warning)', marketing: '#EC4899', transporte: '#06B6D4',
  impuestos: 'var(--color-error)', otro: '#9CA3AF',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none',
  background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)',
}

// ─── PDF Preview Modal ────────────────────────────────────────────────────────

function PdfPreviewModal({
  url, filename, onDownload, onClose,
}: {
  url: string; filename: string; onDownload: () => void; onClose: () => void
}) {
  const { t } = useTranslation()
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', background: '#111',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: '#1c1c1c', borderBottom: '1px solid #333',
        flexShrink: 0,
      }}>
        <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 500 }}>
          {t('reports.preview')} — <span style={{ color: '#fff', fontWeight: 700 }}>{filename}</span>
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onDownload}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
              borderRadius: 8, background: 'var(--color-primary)', color: 'var(--color-primary-text)',
              border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Download size={14} /> {t('reports.download')}
          </button>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, background: '#333', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <X size={14} /> {t('common.close')}
          </button>
        </div>
      </div>
      <iframe src={url} style={{ flex: 1, width: '100%', border: 'none' }} title={t('reports.preview')} />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
      {[...Array(count)].map((_, i) => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sub}</span>}
    </div>
  )
}

type DatePreset = { key: string; fn: () => { desde: string; hasta: string } }

function DateRangeWithPresets({
  desde, hasta, onDesde, onHasta, onConsultar, loading,
}: {
  desde: string; hasta: string
  onDesde: (v: string) => void; onHasta: (v: string) => void
  onConsultar: () => void; loading: boolean
}) {
  const { t } = useTranslation()

  const DATE_PRESETS: DatePreset[] = [
    { key: 'today',     fn: () => { const t2 = todayStr(); return { desde: t2, hasta: t2 } } },
    { key: 'yesterday', fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = dateStr(d); return { desde: s, hasta: s } } },
    { key: 'thisWeek',  fn: () => { const d = new Date(); const diff = d.getDay() === 0 ? 6 : d.getDay() - 1; const mon = new Date(d); mon.setDate(d.getDate() - diff); return { desde: dateStr(mon), hasta: todayStr() } } },
    { key: 'thisMonth', fn: () => ({ desde: firstDayOfMonth(), hasta: todayStr() }) },
    { key: 'lastMonth', fn: () => { const now = new Date(); const last = new Date(now.getFullYear(), now.getMonth(), 0); const first = new Date(last.getFullYear(), last.getMonth(), 1); return { desde: dateStr(first), hasta: dateStr(last) } } },
  ]

  const activeKey = DATE_PRESETS.find((p) => {
    const r = p.fn()
    return r.desde === desde && r.hasta === hasta
  })?.key ?? null

  const applyPreset = (key: string) => {
    const p = DATE_PRESETS.find((x) => x.key === key)
    if (!p) return
    const { desde: d, hasta: h } = p.fn()
    onDesde(d); onHasta(h)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {DATE_PRESETS.map((p) => {
          const active = activeKey === p.key
          return (
            <button key={p.key} onClick={() => applyPreset(p.key)} style={{
              padding: '4px 12px', borderRadius: 999, fontSize: 12,
              fontWeight: active ? 600 : 400,
              background: active ? 'var(--color-primary)' : 'transparent',
              color: active ? 'var(--color-primary-text)' : 'var(--text-secondary)',
              border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{t(`reports.presets.${p.key}`)}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('reports.dateFrom')}</label>
          <input type="date" value={desde} onChange={(e) => onDesde(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('reports.dateTo')}</label>
          <input type="date" value={hasta} onChange={(e) => onHasta(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={onConsultar} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
          borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: loading ? 'var(--border)' : 'var(--color-primary)',
          color: 'var(--color-primary-text)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
          {t('reports.queryBtn')}
        </button>
      </div>
    </div>
  )
}

function ExportButtons({
  onExcel, onPdf, exporting,
}: {
  onExcel: () => void; onPdf: () => void
  exporting: 'excel' | 'pdf' | null
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 28 }}>
      <button onClick={onExcel} disabled={!!exporting} title="Excel" style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
        borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none',
        background: exporting === 'excel' ? 'var(--border)' : '#16a34a18',
        color: exporting === 'excel' ? 'var(--text-secondary)' : '#16a34a',
        outline: '1px solid #16a34a40', cursor: exporting ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
      }}>
        {exporting === 'excel' ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileSpreadsheet size={13} />}
        Excel
      </button>
      <button onClick={onPdf} disabled={!!exporting} title="PDF" style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
        borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none',
        background: exporting === 'pdf' ? 'var(--border)' : '#dc262618',
        color: exporting === 'pdf' ? 'var(--text-secondary)' : '#dc2626',
        outline: '1px solid #dc262640', cursor: exporting ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
      }}>
        {exporting === 'pdf' ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={13} />}
        PDF
      </button>
    </div>
  )
}

// ─── Ventas tab ───────────────────────────────────────────────────────────────

function VentasTab() {
  const { t } = useTranslation()
  const { usuario } = useAuthStore()
  const [desde, setDesde] = useState(firstDayOfMonth())
  const [hasta, setHasta] = useState(todayStr())
  const [ventas, setVentas] = useState<VentaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [preview, setPreview] = useState<{ url: string; filename: string; onDownload: () => void } | null>(null)

  const empresa = { nombre: usuario?.empresa?.nombre ?? 'PyCore ERP', logo_url: usuario?.empresa?.logo_url }

  const metodoLabel = (key: string) => t(`reports.paymentMethods.${key}`, { defaultValue: key })
  const estadoLabel = (key: string) => t(`reports.statuses.${key}`, { defaultValue: key })

  const consultar = useCallback(async (d = desde, h = hasta) => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/sales/ventas/', { params: { fecha_desde: d, fecha_hasta: h, estado: 'activo,pagado' } })
      setVentas(extractResults<VentaItem>(res.data))
    } catch { /* noop */ } finally { setLoading(false) }
  }, [desde, hasta])

  useEffect(() => { consultar(firstDayOfMonth(), todayStr()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buildRows = (all: VentaItem[]) => all.map((v) => ({
    folio: v.folio ?? '—',
    nombre_cliente: (v.nombre_cliente as string) ?? '—',
    fecha_venta: fmtDate(v.fecha_venta as string | undefined),
    metodo_pago: metodoLabel(String(v.metodo_pago ?? '')),
    estado: estadoLabel(String(v.estado ?? '')),
    total: fmt(v.total),
    saldo_pendiente: fmt(v.saldo_pendiente as number | undefined),
  }))

  const COLS_PDF = [
    { header: t('reports.sales.columns.folio'),          key: 'folio' },
    { header: t('reports.sales.columns.client'),         key: 'nombre_cliente' },
    { header: t('reports.sales.columns.date'),           key: 'fecha_venta' },
    { header: t('reports.sales.columns.paymentMethod'),  key: 'metodo_pago' },
    { header: t('reports.sales.columns.status'),         key: 'estado' },
    { header: t('reports.sales.columns.total'),          key: 'total' },
    { header: t('reports.sales.columns.pendingBalance'), key: 'saldo_pendiente' },
  ]

  const handleExcel = async () => {
    setExporting('excel')
    try {
      const all = await fetchAllVentas(desde, hasta)
      const rows = all.map((v) => ({
        folio: v.folio ?? '—',
        nombre_cliente: (v.nombre_cliente as string) ?? '—',
        fecha_venta: fmtDate(v.fecha_venta as string | undefined),
        metodo_pago: metodoLabel(String(v.metodo_pago ?? '')),
        estado: estadoLabel(String(v.estado ?? '')),
        total: Number(v.total ?? 0),
        saldo_pendiente: Number(v.saldo_pendiente ?? 0),
      }))
      await exportToExcel({
        data: rows,
        columns: [
          { header: t('reports.sales.columns.folio'),          key: 'folio',           width: 18 },
          { header: t('reports.sales.columns.client'),         key: 'nombre_cliente',  width: 32 },
          { header: t('reports.sales.columns.date'),           key: 'fecha_venta',     width: 24 },
          { header: t('reports.sales.columns.paymentMethod'),  key: 'metodo_pago',     width: 20 },
          { header: t('reports.sales.columns.status'),         key: 'estado',          width: 16 },
          { header: t('reports.sales.columns.total'),          key: 'total',           width: 16 },
          { header: t('reports.sales.columns.pendingBalance'), key: 'saldo_pendiente', width: 18 },
        ],
        filename: `reporte-ventas-${desde}_${hasta}`,
        title: t('reports.sales.pdfTitle'), desde, hasta, empresa,
      })
    } catch { /* noop */ } finally { setExporting(null) }
  }

  const handlePdf = async () => {
    setExporting('pdf')
    try {
      const all = await fetchAllVentas(desde, hasta)
      const total = all.reduce((s, v) => s + Number(v.total ?? 0), 0)
      const count = all.length
      const avg = count > 0 ? total / count : 0
      const result = await previewPDF({
        data: buildRows(all),
        columns: COLS_PDF,
        filename: `reporte-ventas-${desde}_${hasta}`,
        title: t('reports.sales.pdfTitle'), desde, hasta, empresa, total,
        summary: [
          { label: t('reports.sales.totalSalesSummary'), value: fmt(total) },
          { label: t('reports.sales.avgTicketSummary'),  value: fmt(avg) },
          { label: t('reports.sales.transactionsSummary'), value: String(count) },
        ],
      })
      setPreview(result)
    } catch { /* noop */ } finally { setExporting(null) }
  }

  const total = ventas.reduce((s, v) => s + Number(v.total ?? 0), 0)
  const count = ventas.length
  const avg = count > 0 ? total / count : 0

  return (
    <>
      {preview && <PdfPreviewModal url={preview.url} filename={preview.filename} onDownload={preview.onDownload} onClose={() => setPreview(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <DateRangeWithPresets desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} onConsultar={() => consultar()} loading={loading} />
          <ExportButtons onExcel={handleExcel} onPdf={handlePdf} exporting={exporting} />
        </div>

        {loading && <SkeletonRows />}

        {!loading && (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <SummaryCard
                label={t('reports.sales.totalSales')}
                value={fmt(total)}
                sub={`${count} ${count !== 1 ? t('reports.sales.salePlural') : t('reports.sales.saleSingular')}`}
              />
              <SummaryCard label={t('reports.sales.avgTicket')} value={fmt(avg)} />
              <SummaryCard label={t('reports.sales.quantity')} value={String(count)} sub={t('reports.sales.transactions')} />
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('reports.sales.periodTitle')}</p>
              </div>
              {ventas.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  {t('reports.sales.noData')}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                        {[
                          t('reports.sales.columns.folio'),
                          t('reports.sales.columns.client'),
                          t('reports.sales.columns.date'),
                          t('reports.sales.columns.paymentMethod'),
                          t('reports.sales.columns.status'),
                          t('reports.sales.columns.total'),
                        ].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.map((v, i) => {
                        const estado = String(v.estado ?? '')
                        const color = ESTADO_COLOR[estado] ?? 'var(--text-secondary)'
                        return (
                          <tr key={(v.id_venta as string) ?? i} style={{ borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}>{v.folio ?? '—'}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text)' }}>{(v.nombre_cliente as string) ?? '—'}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap' }}>{fmtDate(v.fecha_venta as string | undefined)}</td>
                            <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{metodoLabel(String(v.metodo_pago ?? ''))}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${color}20`, color }}>{estadoLabel(estado)}</span>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{fmt(v.total)}</td>
                          </tr>
                        )
                      })}
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

// ─── Compras tab ──────────────────────────────────────────────────────────────

function ComprasTab() {
  const { t } = useTranslation()
  const { usuario } = useAuthStore()
  const [desde, setDesde] = useState(firstDayOfMonth())
  const [hasta, setHasta] = useState(todayStr())
  const [compras, setCompras] = useState<CompraItem[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [preview, setPreview] = useState<{ url: string; filename: string; onDownload: () => void } | null>(null)

  const empresa = { nombre: usuario?.empresa?.nombre ?? 'PyCore ERP', logo_url: usuario?.empresa?.logo_url }

  const metodoLabel = (key: string) => t(`reports.paymentMethods.${key}`, { defaultValue: key })
  const estadoLabel = (key: string) => t(`reports.statuses.${key}`, { defaultValue: key })

  const consultar = useCallback(async (d = desde, h = hasta) => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/purchases/compras/', { params: { fecha_desde: d, fecha_hasta: h } })
      setCompras(extractResults<CompraItem>(res.data))
    } catch { /* noop */ } finally { setLoading(false) }
  }, [desde, hasta])

  useEffect(() => { consultar(firstDayOfMonth(), todayStr()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buildRows = (all: CompraItem[]) => all.map((c) => ({
    folio: c.folio ?? '—',
    nombre_proveedor: (c.nombre_proveedor as string) ?? '—',
    fecha_compra: fmtDate(c.fecha_compra as string | undefined),
    metodo_pago: metodoLabel(String(c.metodo_pago ?? '')),
    estado: estadoLabel(String(c.estado ?? '')),
    total: fmt(c.total),
    saldo_pendiente: fmt(c.saldo_pendiente as number | undefined),
  }))

  const COLS_PDF = [
    { header: t('reports.purchases.columns.folio'),          key: 'folio' },
    { header: t('reports.purchases.columns.provider'),       key: 'nombre_proveedor' },
    { header: t('reports.purchases.columns.date'),           key: 'fecha_compra' },
    { header: t('reports.purchases.columns.paymentMethod'),  key: 'metodo_pago' },
    { header: t('reports.purchases.columns.status'),         key: 'estado' },
    { header: t('reports.purchases.columns.total'),          key: 'total' },
    { header: t('reports.purchases.columns.pendingBalance'), key: 'saldo_pendiente' },
  ]

  const handleExcel = async () => {
    setExporting('excel')
    try {
      const all = await fetchAllCompras(desde, hasta)
      const rows = all.map((c) => ({
        folio: c.folio ?? '—',
        nombre_proveedor: (c.nombre_proveedor as string) ?? '—',
        fecha_compra: fmtDate(c.fecha_compra as string | undefined),
        metodo_pago: metodoLabel(String(c.metodo_pago ?? '')),
        estado: estadoLabel(String(c.estado ?? '')),
        total: Number(c.total ?? 0),
        saldo_pendiente: Number(c.saldo_pendiente ?? 0),
      }))
      await exportToExcel({
        data: rows,
        columns: [
          { header: t('reports.purchases.columns.folio'),          key: 'folio',             width: 18 },
          { header: t('reports.purchases.columns.provider'),       key: 'nombre_proveedor',  width: 32 },
          { header: t('reports.purchases.columns.date'),           key: 'fecha_compra',      width: 24 },
          { header: t('reports.purchases.columns.paymentMethod'),  key: 'metodo_pago',       width: 20 },
          { header: t('reports.purchases.columns.status'),         key: 'estado',            width: 16 },
          { header: t('reports.purchases.columns.total'),          key: 'total',             width: 16 },
          { header: t('reports.purchases.columns.pendingBalance'), key: 'saldo_pendiente',   width: 18 },
        ],
        filename: `reporte-compras-${desde}_${hasta}`,
        title: t('reports.purchases.pdfTitle'), desde, hasta, empresa,
      })
    } catch { /* noop */ } finally { setExporting(null) }
  }

  const handlePdf = async () => {
    setExporting('pdf')
    try {
      const all = await fetchAllCompras(desde, hasta)
      const total = all.reduce((s, c) => s + Number(c.total ?? 0), 0)
      const count = all.length
      const avg = count > 0 ? total / count : 0
      const result = await previewPDF({
        data: buildRows(all),
        columns: COLS_PDF,
        filename: `reporte-compras-${desde}_${hasta}`,
        title: t('reports.purchases.pdfTitle'), desde, hasta, empresa, total,
        summary: [
          { label: t('reports.purchases.totalPurchasesSummary'), value: fmt(total) },
          { label: t('reports.purchases.averageSummary'),        value: fmt(avg) },
          { label: t('reports.purchases.ordersSummary'),         value: String(count) },
        ],
      })
      setPreview(result)
    } catch { /* noop */ } finally { setExporting(null) }
  }

  const total = compras.reduce((s, c) => s + Number(c.total ?? 0), 0)
  const count = compras.length
  const avg = count > 0 ? total / count : 0

  return (
    <>
      {preview && <PdfPreviewModal url={preview.url} filename={preview.filename} onDownload={preview.onDownload} onClose={() => setPreview(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <DateRangeWithPresets desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} onConsultar={() => consultar()} loading={loading} />
          <ExportButtons onExcel={handleExcel} onPdf={handlePdf} exporting={exporting} />
        </div>

        {loading && <SkeletonRows />}

        {!loading && (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <SummaryCard
                label={t('reports.purchases.totalPurchases')}
                value={fmt(total)}
                sub={`${count} ${count !== 1 ? t('reports.purchases.purchasePlural') : t('reports.purchases.purchaseSingular')}`}
              />
              <SummaryCard label={t('reports.purchases.average')} value={fmt(avg)} />
              <SummaryCard label={t('reports.purchases.quantity')} value={String(count)} sub={t('reports.purchases.orders')} />
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('reports.purchases.periodTitle')}</p>
              </div>
              {compras.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  {t('reports.purchases.noData')}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                        {[
                          t('reports.purchases.columns.folio'),
                          t('reports.purchases.columns.provider'),
                          t('reports.purchases.columns.date'),
                          t('reports.purchases.columns.paymentMethod'),
                          t('reports.purchases.columns.status'),
                          t('reports.purchases.columns.total'),
                        ].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compras.map((c, i) => {
                        const estado = String(c.estado ?? '')
                        const color = ESTADO_COLOR[estado] ?? 'var(--text-secondary)'
                        return (
                          <tr key={(c.id_compra as string) ?? i} style={{ borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}>{c.folio ?? '—'}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text)' }}>{(c.nombre_proveedor as string) ?? '—'}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap' }}>{fmtDate(c.fecha_compra as string | undefined)}</td>
                            <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{metodoLabel(String(c.metodo_pago ?? ''))}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${color}20`, color }}>{estadoLabel(estado)}</span>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{fmt(c.total)}</td>
                          </tr>
                        )
                      })}
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

// ─── Gastos tab ───────────────────────────────────────────────────────────────

function GastosTab() {
  const { t } = useTranslation()
  const { usuario } = useAuthStore()
  const [desde, setDesde] = useState(firstDayOfMonth())
  const [hasta, setHasta] = useState(todayStr())
  const [gastos, setGastos] = useState<GastoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [preview, setPreview] = useState<{ url: string; filename: string; onDownload: () => void } | null>(null)

  const empresa = { nombre: usuario?.empresa?.nombre ?? 'PyCore ERP', logo_url: usuario?.empresa?.logo_url }

  const metodoLabel = (key: string) => t(`reports.paymentMethods.${key}`, { defaultValue: key })
  const catLabel    = (key: string) => t(`reports.expenses.categories.${key}`, { defaultValue: key })

  const consultar = useCallback(async (d = desde, h = hasta) => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/finance/gastos/', { params: { fecha_desde: d, fecha_hasta: h } })
      setGastos(extractResults<GastoItem>(res.data))
    } catch { /* noop */ } finally { setLoading(false) }
  }, [desde, hasta])

  useEffect(() => { consultar(firstDayOfMonth(), todayStr()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buildRows = (all: GastoItem[]) => all.map((g) => ({
    folio: g.folio ?? '—',
    concepto: g.concepto ?? '—',
    categoria: catLabel(String(g.categoria ?? 'otro')),
    metodo_pago: metodoLabel(String(g.metodo_pago ?? '')),
    fecha_gasto: fmtDate(g.fecha_gasto),
    monto: fmt(g.monto as number | undefined),
    impuesto_monto: fmt(g.impuesto_monto as number | undefined),
    total: fmt(g.total ?? g.monto),
  }))

  const handleExcel = async () => {
    setExporting('excel')
    try {
      const all = await fetchAllGastos(desde, hasta)
      const rows = all.map((g) => ({
        folio: g.folio ?? '—',
        concepto: g.concepto ?? '—',
        categoria: catLabel(String(g.categoria ?? 'otro')),
        metodo_pago: metodoLabel(String(g.metodo_pago ?? '')),
        fecha_gasto: fmtDate(g.fecha_gasto),
        monto: Number(g.monto ?? 0),
        impuesto_monto: Number(g.impuesto_monto ?? 0),
        total: Number(g.total ?? g.monto ?? 0),
      }))
      await exportToExcel({
        data: rows,
        columns: [
          { header: t('reports.expenses.columns.concept'),       key: 'folio',           width: 18 },
          { header: t('reports.expenses.columns.concept'),       key: 'concepto',        width: 36 },
          { header: t('reports.expenses.columns.category'),      key: 'categoria',       width: 20 },
          { header: t('reports.expenses.columns.paymentMethod'), key: 'metodo_pago',     width: 20 },
          { header: t('reports.expenses.columns.date'),          key: 'fecha_gasto',     width: 24 },
          { header: t('reports.expenses.columns.amount'),        key: 'monto',           width: 16 },
          { header: t('reports.expenses.columns.tax'),           key: 'impuesto_monto',  width: 14 },
          { header: t('reports.expenses.columns.total'),         key: 'total',           width: 16 },
        ],
        filename: `reporte-gastos-${desde}_${hasta}`,
        title: t('reports.expenses.pdfTitle'), desde, hasta, empresa,
      })
    } catch { /* noop */ } finally { setExporting(null) }
  }

  const handlePdf = async () => {
    setExporting('pdf')
    try {
      const all = await fetchAllGastos(desde, hasta)
      const total = all.reduce((s, g) => s + Number(g.total ?? g.monto ?? 0), 0)
      const count = all.length
      const result = await previewPDF({
        data: buildRows(all),
        columns: [
          { header: t('reports.expenses.columns.concept'),       key: 'concepto' },
          { header: t('reports.expenses.columns.category'),      key: 'categoria' },
          { header: t('reports.expenses.columns.paymentMethod'), key: 'metodo_pago' },
          { header: t('reports.expenses.columns.date'),          key: 'fecha_gasto' },
          { header: t('reports.expenses.columns.amount'),        key: 'monto' },
          { header: t('reports.expenses.columns.tax'),           key: 'impuesto_monto' },
          { header: t('reports.expenses.columns.total'),         key: 'total' },
        ],
        filename: `reporte-gastos-${desde}_${hasta}`,
        title: t('reports.expenses.pdfTitle'), desde, hasta, empresa, total,
        summary: [
          { label: t('reports.expenses.totalExpensesSummary'), value: fmt(total) },
          { label: t('reports.expenses.recordsSummary'),       value: String(count) },
        ],
      })
      setPreview(result)
    } catch { /* noop */ } finally { setExporting(null) }
  }

  const total = gastos.reduce((s, g) => s + Number(g.total ?? g.monto ?? 0), 0)
  const count = gastos.length

  const byCategoria = gastos.reduce<Record<string, number>>((acc, g) => {
    const cat = String(g.categoria ?? 'otro')
    acc[cat] = (acc[cat] ?? 0) + Number(g.total ?? g.monto ?? 0)
    return acc
  }, {})
  const maxCat = Math.max(...Object.values(byCategoria), 1)
  const categorias = Object.entries(byCategoria).sort((a, b) => b[1] - a[1])

  return (
    <>
      {preview && <PdfPreviewModal url={preview.url} filename={preview.filename} onDownload={preview.onDownload} onClose={() => setPreview(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <DateRangeWithPresets desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} onConsultar={() => consultar()} loading={loading} />
          <ExportButtons onExcel={handleExcel} onPdf={handlePdf} exporting={exporting} />
        </div>

        {loading && <SkeletonRows />}

        {!loading && (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <SummaryCard
                label={t('reports.expenses.totalExpenses')}
                value={fmt(total)}
                sub={`${count} ${count !== 1 ? t('reports.expenses.expensePlural') : t('reports.expenses.expenseSingular')}`}
              />
              <SummaryCard label={t('reports.expenses.quantity')} value={String(count)} sub={t('reports.expenses.records')} />
            </div>

            {categorias.length > 0 && (
              <div className="card" style={{ padding: '16px 20px' }}>
                <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('reports.expenses.byCategory')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {categorias.map(([cat, amount]) => {
                    const color = CATEGORIA_COLORS[cat] ?? '#9CA3AF'
                    const label = catLabel(cat)
                    const pct = (amount / maxCat) * 100
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{fmt(amount)}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('reports.expenses.periodTitle')}</p>
              </div>
              {gastos.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  {t('reports.expenses.noData')}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                        {[
                          t('reports.expenses.columns.concept'),
                          t('reports.expenses.columns.category'),
                          t('reports.expenses.columns.paymentMethod'),
                          t('reports.expenses.columns.date'),
                          t('reports.expenses.columns.total'),
                        ].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gastos.map((g, i) => {
                        const cat   = String(g.categoria ?? 'otro')
                        const color = CATEGORIA_COLORS[cat] ?? '#9CA3AF'
                        const label = catLabel(cat)
                        return (
                          <tr key={(g.id_gasto as string) ?? i} style={{ borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{g.concepto ?? '—'}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${color}20`, color }}>{label}</span>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{metodoLabel(String(g.metodo_pago ?? ''))}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap' }}>{fmtDate(g.fecha_gasto)}</td>
                            <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{fmt(g.total ?? g.monto)}</td>
                          </tr>
                        )
                      })}
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

// ─── Main page ────────────────────────────────────────────────────────────────

type TabKey = 'ventas' | 'compras' | 'gastos'

export function ReportesPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const [tab, setTab] = useState<TabKey>('ventas')

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'ventas',  label: t('reports.tabs.sales') },
    { key: 'compras', label: t('reports.tabs.purchases') },
    { key: 'gastos',  label: t('reports.tabs.expenses') },
  ]

  if (!hasPermission('reportes.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('reports.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('reports.title')}</h1>
        <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>{t('reports.subtitle')}</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 4px' }}>
          {TABS.map((tabItem) => (
            <button key={tabItem.key} onClick={() => setTab(tabItem.key)} style={{
              padding: '13px 20px', fontSize: 14,
              fontWeight: tab === tabItem.key ? 700 : 400,
              color: tab === tabItem.key ? 'var(--color-primary)' : 'var(--text-secondary)',
              background: 'none', border: 'none',
              borderBottom: tab === tabItem.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s',
            }}>{tabItem.label}</button>
          ))}
        </div>
        <div style={{ padding: '20px 20px' }}>
          {tab === 'ventas'  && <VentasTab />}
          {tab === 'compras' && <ComprasTab />}
          {tab === 'gastos'  && <GastosTab />}
        </div>
      </div>
    </div>
  )
}
