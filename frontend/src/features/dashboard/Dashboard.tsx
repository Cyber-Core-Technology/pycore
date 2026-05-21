import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWsEvent } from '@/hooks/useWebSocket'
import { usePermissions } from '@/hooks/usePermissions'
import { useDashboard } from '@/hooks/useDashboard'
import { formatMXN, formatFecha } from '@/utils/formatters'
import { ROUTES } from '@/router/routes'
import type { VentaDia, TopProducto, TopCliente, MetodoPagoItem, AlertaStock, CxcItem } from '@/types/dashboard.types'

// ─── Utilidades ─────────────────────────────────────────────────────────────

function pct(a: number, b: number): number {
  if (!b) return 0
  return Math.round(((a - b) / b) * 100)
}

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function labelFecha(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return DIAS_ES[d.getDay()]
}

// ─── Contador animado ────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number
}) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number>(0)
  useEffect(() => {
    const start = ref.current
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 900, 1)
      const e = 1 - Math.pow(1 - p, 3)
      const cur = start + (value - start) * e
      setDisplay(cur)
      if (p < 1) requestAnimationFrame(tick)
      else ref.current = value
    }
    requestAnimationFrame(tick)
  }, [value])

  const fmt = (n: number) => {
    if (decimals > 0) return n.toFixed(decimals)
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
    return Math.round(n).toLocaleString('es-MX')
  }
  return <span>{prefix}{fmt(display)}{suffix}</span>
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string; value: number; prefix?: string; suffix?: string
  sub?: string; trend?: number; icon: React.ReactNode; delay?: number; isLoading?: boolean; decimals?: number
}

function KpiCard({ label, value, prefix = '', suffix = '', sub, trend, icon, delay = 0, isLoading, decimals = 0 }: KpiCardProps) {
  const { t } = useTranslation()
  const trendColor = trend === undefined ? '' : trend >= 0 ? 'var(--color-success)' : 'var(--color-error)'
  const TrendIcon  = trend === undefined ? null : trend >= 0 ? TrendingUp : TrendingDown
  return (
    <div
      className="card p-4 card-enter flex flex-col gap-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
        <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
        {isLoading
          ? <span className="inline-block w-24 h-7 rounded animate-pulse" style={{ background: 'var(--border)' }} />
          : <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        }
      </p>
      <div className="flex items-center gap-2 min-h-[1rem]">
        {TrendIcon && trend !== undefined && (
          <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: trendColor }}>
            <TrendIcon size={12} />
            {Math.abs(trend)}{t('dashboard.vsYesterday')}
          </span>
        )}
        {sub && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs" style={{ border: '1px solid var(--border)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatMXN(p.value)}</p>
      ))}
    </div>
  )
}

// ─── Gráfica de ventas ───────────────────────────────────────────────────────

function VentasSerie({ data, rango, onRango }: {
  data: VentaDia[]; rango: '7d' | '30d' | 'mes'; onRango: (r: '7d' | '30d' | 'mes') => void
}) {
  const { t } = useTranslation()
  const chartData = data.map((d) => ({
    dia:      labelFecha(d.fecha),
    Ventas:   d.total,
    Utilidad: d.utilidad,
  }))
  return (
    <div className="card p-4 card-enter lg:col-span-2 flex flex-col" style={{ animationDelay: '280ms' }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('dashboard.salesAndProfit')}</p>
        <div className="flex gap-1">
          {(['7d', '30d', 'mes'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRango(r)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
              style={{
                background: rango === r ? 'var(--border)' : 'transparent',
                color: rango === r ? 'var(--text)' : 'var(--text-secondary)',
              }}
            >
              {r === 'mes' ? t('dashboard.thisMonth') : r}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center" style={{ minHeight: '10rem' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('dashboard.noSales')}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gUtil" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} width={38} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="Ventas"   stroke="#3B82F6"             strokeWidth={2} fill="url(#gVentas)" dot={false} />
            <Area type="monotone" dataKey="Utilidad" stroke="var(--color-success)" strokeWidth={2} fill="url(#gUtil)"   dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Donut método de pago ────────────────────────────────────────────────────

const COLORS_METODO = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899']

function MetodoPagoDonut({ data }: { data: MetodoPagoItem[] }) {
  const { t } = useTranslation()
  if (data.length === 0) return null
  return (
    <div className="card p-4 card-enter" style={{ animationDelay: '360ms' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{t('dashboard.paymentMethodMonth')}</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="label" cx="50%" cy="50%"
            innerRadius={45} outerRadius={72} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS_METODO[i % COLORS_METODO.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatMXN(Number(v))} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Top Productos ───────────────────────────────────────────────────────────

function TopProductos({ data }: { data: TopProducto[] }) {
  const { t } = useTranslation()
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.ingreso), 1)
  return (
    <div className="card p-4 card-enter" style={{ animationDelay: '440ms' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{t('dashboard.topProducts')}</p>
      <div className="flex flex-col gap-2">
        {data.map((p, i) => (
          <div key={p.sku} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium truncate max-w-[60%]" style={{ color: 'var(--text)' }}>
                <span className="mr-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>#{i + 1}</span>
                {p.nombre}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{formatMXN(p.ingreso)}</span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ background: 'var(--surface-hover)' }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${(p.ingreso / max) * 100}%`, background: '#3B82F6' }}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.unidades % 1 === 0 ? p.unidades : p.unidades.toFixed(2)} {t('dashboard.units')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Top Clientes ────────────────────────────────────────────────────────────

function TopClientes({ data }: { data: TopCliente[] }) {
  const { t } = useTranslation()
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.total), 1)
  return (
    <div className="card p-4 card-enter" style={{ animationDelay: '480ms' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{t('dashboard.topClients')}</p>
      <div className="flex flex-col gap-2">
        {data.map((c, i) => (
          <div key={c.nombre} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium truncate max-w-[60%]" style={{ color: 'var(--text)' }}>
                <span className="mr-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>#{i + 1}</span>
                {c.nombre}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{formatMXN(c.total)}</span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ background: 'var(--surface-hover)' }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${(c.total / max) * 100}%`, background: '#8B5CF6' }}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.num_compras} {c.num_compras !== 1 ? t('dashboard.purchases') : t('dashboard.purchase')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Alertas de Stock ────────────────────────────────────────────────────────

function AlertasStock({ data }: { data: AlertaStock[] }) {
  const { t } = useTranslation()
  if (data.length === 0) return null
  return (
    <div className="card p-4 card-enter" style={{ animationDelay: '520ms' }}>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('dashboard.lowStock')}</p>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-warning-bg)', color: '#FBBF24' }}>
          {data.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((a) => (
          <div key={a.sku} className="flex items-center justify-between gap-2 p-2 rounded-lg"
            style={{ background: 'var(--surface-hover)' }}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{a.producto}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>SKU {a.sku}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold" style={{ color: '#F87171' }}>{a.stock} {t('dashboard.units')}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('dashboard.min')} {a.minimo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CxC Pendientes ──────────────────────────────────────────────────────────

function CxcPendientes({ data, vencidas }: { data: CxcItem[]; vencidas: number }) {
  const { t } = useTranslation()
  if (data.length === 0) return null
  return (
    <div className="card p-4 card-enter" style={{ animationDelay: '560ms' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('dashboard.accountsReceivable')}</p>
        {vencidas > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-error-bg)', color: '#F87171' }}>
            {vencidas} {vencidas !== 1 ? t('dashboard.overduesBadge') : t('dashboard.overdueBadge')}
          </span>
        )}
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t('dashboard.client'), t('dashboard.folio'), t('dashboard.due'), t('dashboard.amount'), ''].map((h) => (
                <th key={h} className="text-left pb-2 text-xs font-semibold tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.folio} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-2 text-xs font-medium" style={{ color: 'var(--text)' }}>{c.cliente}</td>
                <td className="py-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{c.folio}</td>
                <td className="py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatFecha(c.vence)}</td>
                <td className="py-2 text-xs font-semibold" style={{ color: 'var(--text)' }}>{formatMXN(c.monto)}</td>
                <td className="py-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: c.estado === 'vencida' ? 'var(--color-error-bg)' : 'rgba(245,158,11,0.1)',
                      color:      c.estado === 'vencida' ? '#F87171' : '#FBBF24',
                    }}>
                    {c.estado === 'vencida' ? t('dashboard.overdueStatus') : t('dashboard.pendingStatus')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const [rango, setRango] = useState<'7d' | '30d' | 'mes'>('7d')
  const { data, isLoading, refetch } = useDashboard(rango)

  useWsEvent('venta.creada',    () => refetch())
  useWsEvent('venta.cancelada', () => refetch())
  useWsEvent('stock.bajo',      () => refetch())
  useWsEvent('compra.recibida', () => refetch())
  useWsEvent('pago.registrado', () => refetch())

  if (!hasPermission('dashboard.ver')) {
    return <Navigate to={ROUTES.VENTAS} replace />
  }

  const kpis    = data?.kpis
  const pctHoy  = kpis ? pct(kpis.ventas_hoy, kpis.ventas_ayer) : 0
  const pctMes  = kpis ? pct(kpis.ventas_mes, kpis.ventas_mes_anterior) : 0

  // Qué secciones tienen datos — evita mostrar widgets vacíos
  const hayStock    = (kpis?.stock_bajo    ?? 0) > 0
  const hayCxc      = (kpis?.cxc_pendiente ?? 0) > 0
  const hayCompras  = (kpis?.compras_mes   ?? 0) > 0
  const hayClientes = (data?.top_clientes?.length ?? 0) > 0
  const hayProductos = (data?.top_productos?.length ?? 0) > 0
  const hayMetodos  = (data?.distribucion_metodo_pago?.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-4 md:gap-5">

      {/* Encabezado KPIs */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            {t('dashboard.keyIndicators')}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
            {t('dashboard.dailySummary')}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={12} /> {t('common.refresh')}
        </button>
      </div>

      {/* KPI Cards — solo las que aplican */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label={t('dashboard.salesToday')} value={kpis?.ventas_hoy ?? 0} prefix="$"
          trend={pctHoy}
          icon={<TrendingUp size={16} />}
          delay={0} isLoading={isLoading}
        />
        <KpiCard
          label={t('dashboard.transactions')} value={kpis?.transacciones_hoy ?? 0}
          sub={t('dashboard.salesTodaySub')}
          icon={<ShoppingCart size={16} />}
          delay={60} isLoading={isLoading}
        />
        <KpiCard
          label={t('dashboard.avgTicket')} value={kpis?.ticket_promedio ?? 0} prefix="$"
          sub={t('dashboard.today')}
          icon={<TrendingUp size={16} />}
          delay={120} isLoading={isLoading}
        />
        <KpiCard
          label={t('dashboard.profitToday')} value={kpis?.utilidad_hoy ?? 0} prefix="$"
          sub={t('dashboard.grossMargin')}
          icon={<TrendingUp size={16} />}
          delay={180} isLoading={isLoading}
        />
        <KpiCard
          label={t('dashboard.salesMonth')} value={kpis?.ventas_mes ?? 0} prefix="$"
          trend={pctMes}
          icon={<TrendingUp size={16} />}
          delay={240} isLoading={isLoading}
        />
        {hayCxc && (
          <KpiCard
            label={t('dashboard.pendingAR')} value={kpis?.cxc_pendiente ?? 0} prefix="$"
            sub={kpis?.cxc_vencidas ? `${kpis.cxc_vencidas} ${t('dashboard.overdue')}` : t('dashboard.upToDate')}
            icon={<TrendingDown size={16} />}
            delay={300} isLoading={isLoading}
          />
        )}
      </div>

      {/* Gráfica (2/3) + Donut (1/3) */}
      <div className={`grid grid-cols-1 gap-3 ${hayMetodos ? 'lg:grid-cols-3' : ''}`}>
        <VentasSerie
          data={data?.ventas_serie ?? []}
          rango={rango}
          onRango={setRango}
        />
        {hayMetodos && (
          <MetodoPagoDonut data={data?.distribucion_metodo_pago ?? []} />
        )}
      </div>

      {/* Top Productos + Top Clientes (solo si tienen datos) */}
      {(hayProductos || hayClientes) && (
        <div className={`grid grid-cols-1 gap-3 ${hayProductos && hayClientes ? 'lg:grid-cols-2' : ''}`}>
          {hayProductos && <TopProductos data={data?.top_productos ?? []} />}
          {hayClientes  && <TopClientes  data={data?.top_clientes  ?? []} />}
        </div>
      )}

      {/* Alertas stock + CxC (solo si tienen datos) */}
      {(hayStock || hayCxc) && (
        <div className={`grid grid-cols-1 gap-3 ${hayStock && hayCxc ? 'lg:grid-cols-2' : ''}`}>
          {hayStock && <AlertasStock  data={data?.alertas_stock   ?? []} />}
          {hayCxc   && (
            <CxcPendientes
              data={data?.cxc_pendientes ?? []}
              vencidas={kpis?.cxc_vencidas ?? 0}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pb-2" style={{ color: 'var(--text-secondary)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--color-success)' }} />
          {t('dashboard.systemOperational')}
        </span>
        <span>PyCore ERP v1.0</span>
      </div>

    </div>
  )
}
