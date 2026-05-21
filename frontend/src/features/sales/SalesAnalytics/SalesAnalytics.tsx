import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSalesReportes } from '@/hooks/useSalesReportes'
import { useAuthStore }     from '@/store/authStore'
import { formatMXN }        from '@/utils/formatters'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import { TrendingUp, ShoppingCart, CreditCard } from 'lucide-react'

const PIE_COLORS = ['#3B82F6', 'var(--color-success)', 'var(--color-info)', 'var(--color-warning)', 'var(--color-error)', '#8B5CF6', '#EC4899']

function KPICard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: 'var(--surface)', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'rgba(24,174,145,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-primary)',
        }}>
          {icon}
        </div>
        <p style={{
          fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: 'var(--text-secondary)', lineHeight: 1.3,
        }}>
          {label}
        </p>
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 12, background: 'var(--surface)',
      border: '1px solid var(--border)', padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</p>
      {children}
    </div>
  )
}

function Skeleton({ height }: { height: number }) {
  return (
    <div style={{ height, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
  )
}

export function SalesAnalytics() {
  const { t } = useTranslation()
  const sucursal = useAuthStore((s) => s.sucursalActiva)

  const hoy   = new Date()
  const hace7 = new Date(hoy); hace7.setDate(hoy.getDate() - 7)
  const fmt   = (d: Date) => d.toISOString().split('T')[0]

  const [fechaDesde, setFechaDesde] = useState(fmt(hace7))
  const [fechaHasta, setFechaHasta] = useState(fmt(hoy))
  const [isDesktop,  setIsDesktop]  = useState(
    typeof window !== 'undefined' && window.innerWidth >= 768
  )

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const { data, isLoading } = useSalesReportes({
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    id_sucursal: sucursal?.id_sucursal,
  })

  const tooltipStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 12,
  }

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', minWidth: 0, flex: 1, boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Filtros de fecha ────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 16px',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('salesAnalytics.dateFrom')}</span>
        <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('salesAnalytics.dateTo')}</span>
        <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />
      </div>

      {/* ── KPIs ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} style={{ borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', padding: '14px 16px' }}>
              <Skeleton height={70} />
            </div>
          ))
        ) : (
          <>
            <KPICard icon={<TrendingUp size={15} />}  label={t('salesAnalytics.totalSales')} value={formatMXN(data?.kpis.total_ventas ?? 0)}    sub={`${data?.kpis.num_ventas ?? 0} ${t('salesAnalytics.salesInPeriod')}`} />
            <KPICard icon={<ShoppingCart size={15} />} label={t('salesAnalytics.numSales')} value={String(data?.kpis.num_ventas ?? 0)}     sub={t('salesAnalytics.activeSales')} />
            <KPICard icon={<CreditCard size={15} />}  label={t('salesAnalytics.avgTicket')} value={formatMXN(data?.kpis.ticket_promedio ?? 0)} sub={t('salesAnalytics.avgTicketSub')} />
          </>
        )}
      </div>

      {/* ── Ventas por día + Pie (desktop: lado a lado) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? '2fr 1fr' : '1fr',
        gap: 12,
      }}>

        {/* Ventas por día */}
        <ChartCard title={t('salesAnalytics.salesByDay')}>
          {isLoading ? <Skeleton height={220} /> : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.ventas_por_dia ?? []} barSize={24} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickFormatter={(v) => `$${v}`}
                    axisLine={false} tickLine={false} width={48}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [formatMXN(Number(v)), 'Total']}
                    labelFormatter={(l) => new Date(l + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}
                  />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Por método de pago */}
        <ChartCard title={t('salesAnalytics.byPaymentMethod')}>
          {isLoading ? <Skeleton height={220} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Pie */}
              <div style={{ width: '100%', height: isDesktop ? 160 : 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.ventas_por_metodo ?? []}
                      dataKey="total"
                      nameKey="metodo"
                      cx="50%" cy="50%"
                      outerRadius="70%"
                      innerRadius="40%"
                      paddingAngle={3}
                    >
                      {(data?.ventas_por_metodo ?? []).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, _, p: any) => [formatMXN(Number(v)), t(`reports.paymentMethods.${p.payload.metodo}`, { defaultValue: p.payload.metodo })]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Lista */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(data?.ventas_por_metodo ?? []).map((m, i) => {
                  const max = data?.ventas_por_metodo[0]?.total ?? 1
                  const pct = Math.round((m.total / max) * 100)
                  return (
                    <div key={m.metodo} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{t(`reports.paymentMethods.${m.metodo}`, { defaultValue: m.metodo })}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.cantidad} {t('salesAnalytics.salesAbbr')}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>{formatMXN(m.total)}</span>
                        </div>
                      </div>
                      <div style={{ height: 3, borderRadius: 4, background: 'var(--surface-hover)' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: PIE_COLORS[i % PIE_COLORS.length], width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )
                })}
                {(data?.ventas_por_metodo ?? []).length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0' }}>{t('salesAnalytics.noData')}</p>
                )}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Ticket promedio por día (full width) ─────────── */}
      <ChartCard title={t('salesAnalytics.avgTicketByDay')}>
        {isLoading ? <Skeleton height={160} /> : (
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.ticket_por_dia ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickFormatter={(v) => `$${v}`}
                  axisLine={false} tickLine={false} width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [formatMXN(Number(v)), t('salesAnalytics.avgTicket')]}
                />
                <Line
                  type="monotone" dataKey="promedio"
                  stroke="var(--color-primary)" strokeWidth={2}
                  dot={{ fill: 'var(--color-primary)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* ── Top productos + clientes (desktop: lado a lado) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
        gap: 12,
      }}>

        {/* Top productos */}
        <ChartCard title={t('salesAnalytics.topProducts')}>
          {isLoading ? <Skeleton height={160} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.top_productos ?? []).slice(0, 6).map((p, i) => {
                const max = data?.top_productos[0]?.total ?? 1
                const pct = Math.round((p.total / max) * 100)
                return (
                  <div key={p.nombre} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>{formatMXN(p.total)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: 'var(--surface-hover)' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: PIE_COLORS[i % PIE_COLORS.length], width: `${pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
              {(data?.top_productos ?? []).length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>{t('salesAnalytics.noData')}</p>
              )}
            </div>
          )}
        </ChartCard>

        {/* Top clientes */}
        <ChartCard title={t('salesAnalytics.topClients')}>
          {isLoading ? <Skeleton height={160} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.top_clientes ?? []).slice(0, 6).map((c, i) => {
                const max = data?.top_clientes[0]?.total ?? 1
                const pct = Math.round((c.total / max) * 100)
                return (
                  <div key={c.nombre} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>{formatMXN(c.total)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: 'var(--surface-hover)' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: PIE_COLORS[i % PIE_COLORS.length], width: `${pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
              {(data?.top_clientes ?? []).length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>{t('salesAnalytics.noClientsInPeriod')}</p>
              )}
            </div>
          )}
        </ChartCard>

      </div>
    </div>
  )
}