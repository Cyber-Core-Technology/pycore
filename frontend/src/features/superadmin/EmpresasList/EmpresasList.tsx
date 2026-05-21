import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEmpresas } from '@/hooks/useSuperAdmin'
import { EmpresaWizard } from '@/features/superadmin/EmpresaWizard/EmpresaWizard'
import { EmpresaDetailDrawer } from '@/features/superadmin/EmpresaDetailDrawer/EmpresaDetailDrawer'
import type { EmpresaAdmin, PlanEmpresa } from '@/types/superadmin.types'

const PLAN_STYLES: Record<PlanEmpresa, { bg: string; color: string }> = {
  basico:      { bg: 'rgba(107,114,128,0.12)', color: '#6B7280' },
  profesional: { bg: 'var(--color-info-bg)',   color: 'var(--color-info)' },
  empresarial: { bg: 'rgba(168,85,247,0.12)',  color: '#A855F7' },
  elite:       { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
}

function PlanBadge({ plan }: { plan: PlanEmpresa }) {
  const { t } = useTranslation()
  const s = PLAN_STYLES[plan] ?? PLAN_STYLES.basico
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {t(`empresasList.planes.${plan}`, { defaultValue: plan })}
    </span>
  )
}

function StatCard({
  label,
  value,
  accentColor,
  icon,
}: {
  label: string
  value: number | string
  accentColor?: string
  icon: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: '20px 24px',
        borderRadius: 14,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: accentColor ? `${accentColor}18` : 'rgba(245,158,11,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: accentColor ?? 'var(--color-warning)',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 13,
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
}

export function EmpresasList() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useEmpresas()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<PlanEmpresa | ''>('')
  const [activoFilter, setActivoFilter] = useState<'todas' | 'activas' | 'inactivas'>('todas')
  const [showWizard, setShowWizard] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const todos: EmpresaAdmin[] = data?.results ?? []

  // Client-side filtering
  const filtrados = todos.filter((e) => {
    if (planFilter && e.plan !== planFilter) return false
    if (activoFilter === 'activas' && !e.activo) return false
    if (activoFilter === 'inactivas' && e.activo) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.nombre.toLowerCase().includes(q) ||
        (e.email ?? '').toLowerCase().includes(q) ||
        (e.rfc ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalActivas = todos.filter(e => e.activo).length
  const totalInactivas = todos.filter(e => !e.activo).length
  const enterpriseCount = todos.filter(e => (e.plan as string) === 'enterprise').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
            {t('empresasList.title')}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {t('empresasList.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--color-warning)',
            color: '#1C1917',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('empresasList.newEmpresa')}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label={t('empresasList.totalEmpresas')}
          value={isLoading ? '…' : todos.length}
          accentColor="#F59E0B"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          }
        />
        <StatCard
          label={t('empresasList.statActivas')}
          value={isLoading ? '…' : totalActivas}
          accentColor="#22C55E"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
        />
        <StatCard
          label={t('empresasList.statInactivas')}
          value={isLoading ? '…' : totalInactivas}
          accentColor="#EF4444"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          }
        />
        <StatCard
          label={t('empresasList.statEnterprise')}
          value={isLoading ? '…' : enterpriseCount}
          accentColor="#F59E0B"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          }
        />
      </div>

      {/* Search + filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          padding: '16px 20px',
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder={t('empresasList.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Plan filter */}
        <select
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
            minWidth: 140,
          }}
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value as PlanEmpresa | '')}
        >
          <option value="">{t('empresasList.allPlans')}</option>
          <option value="basico">{t('empresasList.planes.basico')}</option>
          <option value="profesional">{t('empresasList.planes.profesional')}</option>
          <option value="empresarial">{t('empresasList.planes.empresarial')}</option>
          <option value="enterprise">{t('empresasList.planes.elite')}</option>
        </select>

        {/* Estado filter */}
        <select
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
            minWidth: 130,
          }}
          value={activoFilter}
          onChange={e => setActivoFilter(e.target.value as typeof activoFilter)}
        >
          <option value="todas">{t('empresasList.filterTodas')}</option>
          <option value="activas">{t('empresasList.filterActivas')}</option>
          <option value="inactivas">{t('empresasList.filterInactivas')}</option>
        </select>

        {(search || planFilter || activoFilter !== 'todas') && (
          <button
            onClick={() => { setSearch(''); setPlanFilter(''); setActivoFilter('todas') }}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t('empresasList.clearFilters')}
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {t('empresasList.countLabel', { count: filtrados.length, total: todos.length })}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* Loading state */}
        {isLoading && (
          <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid var(--border)',
                borderTopColor: 'var(--color-warning)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('empresasList.loading')}</span>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-error)', fontWeight: 600 }}>{t('empresasList.loadError')}</p>
            <button
              onClick={() => refetch()}
              style={{
                marginTop: 12,
                padding: '7px 18px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t('empresasList.retry')}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtrados.length === 0 && (
          <div style={{ padding: '64px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 48 }}>🏢</div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {todos.length === 0 ? t('empresasList.empty') : t('empresasList.noResults')}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                {todos.length === 0 ? t('empresasList.emptyHint') : t('empresasList.noResultsHint')}
              </p>
            </div>
            {todos.length === 0 && (
              <button
                onClick={() => setShowWizard(true)}
                style={{
                  marginTop: 4,
                  padding: '9px 20px',
                  borderRadius: 9,
                  border: 'none',
                  background: 'var(--color-warning)',
                  color: '#1C1917',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + {t('empresasList.newEmpresa')}
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && filtrados.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={thStyle}>{t('empresasList.colEmpresa')}</th>
                  <th style={thStyle}>{t('empresasList.colPlan')}</th>
                  <th style={thStyle}>{t('empresasList.colTipo')}</th>
                  <th style={thStyle}>{t('empresasList.colEmail')}</th>
                  <th style={thStyle}>{t('empresasList.colRegistro')}</th>
                  <th style={thStyle}>{t('empresasList.colEstado')}</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>{t('empresasList.colVer')}</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((empresa, idx) => (
                  <tr
                    key={empresa.id_empresa}
                    className="data-row"
                    onClick={() => setSelectedId(empresa.id_empresa)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Empresa */}
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{empresa.nombre}</div>
                      {empresa.slug && (
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {empresa.slug}
                        </div>
                      )}
                    </td>

                    {/* Plan */}
                    <td style={tdStyle}>
                      <PlanBadge plan={empresa.plan} />
                    </td>

                    {/* Tipo */}
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 12 }}>
                      {t(`empresasList.tipos.${empresa.tipo_negocio}`, { defaultValue: empresa.tipo_negocio })}
                    </td>

                    {/* Email */}
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 13 }}>
                      {empresa.email || '—'}
                    </td>

                    {/* Fecha registro */}
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {empresa.fecha_registro
                        ? new Date(empresa.fecha_registro).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—'
                      }
                    </td>

                    {/* Estado */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: empresa.activo ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                          color: empresa.activo ? 'var(--color-success)' : 'var(--color-error)',
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {empresa.activo ? t('empresasList.activa') : t('empresasList.inactiva')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedId(empresa.id_empresa)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          const btn = e.currentTarget as HTMLButtonElement
                          btn.style.background = 'rgba(245,158,11,0.1)'
                          btn.style.borderColor = 'rgba(245,158,11,0.4)'
                          btn.style.color = 'var(--color-warning)'
                        }}
                        onMouseLeave={e => {
                          const btn = e.currentTarget as HTMLButtonElement
                          btn.style.background = 'transparent'
                          btn.style.borderColor = 'var(--border)'
                          btn.style.color = 'var(--text-secondary)'
                        }}
                        title={t('empresasList.verDetalle')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Wizard modal */}
      {showWizard && (
        <EmpresaWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => { setShowWizard(false); refetch() }}
        />
      )}

      {/* Detail drawer */}
      {selectedId && (
        <EmpresaDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
