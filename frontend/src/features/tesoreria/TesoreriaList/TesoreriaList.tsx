import { useState } from 'react'
import { Plus, RefreshCw, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCuentasBancarias } from '@/hooks/useTesoreria'
import { usePermissions } from '@/hooks/usePermissions'
import type { CuentaBancaria, TipoCuenta } from '@/types/finanzas.types'
import { CuentaBancariaFormModal } from '../CuentaBancariaFormModal/CuentaBancariaFormModal'

const TIPO_COLOR: Record<TipoCuenta, { bg: string; color: string }> = {
  cheques:   { bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
  ahorro:    { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  inversion: { bg: 'rgba(168,85,247,0.12)',   color: '#A855F7' },
  caja:      { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
}

function TipoBadge({ tipo }: { tipo: TipoCuenta }) {
  const { t } = useTranslation()
  const cfg = TIPO_COLOR[tipo] ?? { bg: 'var(--surface-hover)', color: 'var(--text-secondary)' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...cfg }}>
      {t(`treasury.accountTypes.${tipo}`, { defaultValue: tipo })}
    </span>
  )
}

function MonedaBadge({ moneda }: { moneda: string }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', letterSpacing: '0.05em' }}>
      {moneda}
    </span>
  )
}

function AccountCard({ cuenta, onEdit }: { cuenta: CuentaBancaria; onEdit: (c: CuentaBancaria) => void }) {
  const { t } = useTranslation()
  const saldo = parseFloat(cuenta.saldo_actual)
  const saldoColor = saldo >= 0 ? 'var(--color-success)' : 'var(--color-error)'

  return (
    <div
      className="card"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        position: 'relative',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cuenta.nombre}
            </h3>
            {cuenta.es_principal && (
              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid var(--color-info-border)', letterSpacing: '0.04em' }}>
                {t('treasury.mainBadge')}
              </span>
            )}
            {!cuenta.activo && (
              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                {t('treasury.inactiveBadge')}
              </span>
            )}
          </div>
          {cuenta.banco && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{cuenta.banco}</p>
          )}
        </div>

        <button
          onClick={() => onEdit(cuenta)}
          title={t('treasury.editAccount')}
          aria-label={`${t('treasury.editAccount')} ${cuenta.nombre}`}
          style={{ padding: 7, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Saldo */}
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>{t('treasury.balanceLabel')}</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: saldoColor, margin: 0, letterSpacing: '-0.02em' }}>
          {saldo.toLocaleString('es-MX', { style: 'currency', currency: cuenta.moneda === 'MXN' ? 'MXN' : cuenta.moneda === 'USD' ? 'USD' : 'EUR', minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Bottom badges row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <TipoBadge tipo={cuenta.tipo_cuenta} />
        <MonedaBadge moneda={cuenta.moneda} />
        {cuenta.numero_cuenta && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            ···{cuenta.numero_cuenta.slice(-4)}
          </span>
        )}
      </div>
    </div>
  )
}

export function TesoreriaList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const [showForm, setShowForm]     = useState(false)
  const [editTarget, setEditTarget] = useState<CuentaBancaria | null>(null)

  const { data, isLoading, refetch } = useCuentasBancarias()
  const cuentas = data?.results ?? []

  const handleEdit = (cuenta: CuentaBancaria) => {
    setEditTarget(cuenta)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setEditTarget(null)
  }

  if (!hasPermission('finanzas.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('treasury.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  const accountCountLabel = cuentas.length === 1
    ? `1 ${t('treasury.accountSingular')}`
    : `${cuentas.length} ${t('treasury.accountPlural')}`

  return (
    <>
      {(showForm || editTarget) && (
        <CuentaBancariaFormModal
          cuenta={editTarget}
          onClose={handleClose}
          onSuccess={() => { handleClose(); refetch() }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('treasury.title')}</h1>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>
              {accountCountLabel}
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
                onClick={() => { setEditTarget(null); setShowForm(true) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                {t('treasury.newAccount')}
              </button>
            )}
          </div>
        </div>

        {/* Summary bar */}
        {cuentas.length > 0 && !isLoading && (
          <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>{t('treasury.totalMXN')}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '2px 0 0', letterSpacing: '-0.01em' }}>
                {cuentas
                  .filter((c) => c.moneda === 'MXN')
                  .reduce((s, c) => s + parseFloat(c.saldo_actual), 0)
                  .toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </p>
            </div>
            <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>{t('treasury.activeAccounts')}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '2px 0 0' }}>
                {cuentas.filter((c) => c.activo).length}
              </p>
            </div>
            <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>{t('treasury.mainAccount')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>
                {cuentas.find((c) => c.es_principal)?.nombre ?? '—'}
              </p>
            </div>
          </div>
        )}

        {/* Grid of cards */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 180, borderRadius: 12, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : cuentas.length === 0 ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
            <span style={{ fontSize: 48 }}>🏦</span>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('treasury.noAccounts')}</p>
            {hasPermission('finanzas.crear') && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('treasury.addFirst')}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {cuentas.map((cuenta) => (
              <AccountCard
                key={cuenta.id_cuenta}
                cuenta={cuenta}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
