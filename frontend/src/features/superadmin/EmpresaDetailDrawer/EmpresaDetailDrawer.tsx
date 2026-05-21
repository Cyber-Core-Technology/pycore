import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useEmpresaDetalle, useActualizarEmpresa } from '@/hooks/useSuperAdmin'
import type { EmpresaAdmin, PlanEmpresa, TipoNegocio } from '@/types/superadmin.types'

interface Props {
  id: string
  onClose: () => void
}

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
    <span style={{ padding: '3px 12px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600 }}>
      {t(`empresaDetail.planes.${plan}`, { defaultValue: plan })}
    </span>
  )
}

function StatusBadge({ activo }: { activo: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      style={{
        padding: '3px 12px',
        borderRadius: 999,
        background: activo ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
        color: activo ? 'var(--color-success)' : 'var(--color-error)',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {activo ? t('empresaDetail.statusActiva') : t('empresaDetail.statusInactiva')}
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 3,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{children}</div>
    </div>
  )
}

export function EmpresaDetailDrawer({ id, onClose }: Props) {
  const { t } = useTranslation()
  const { data: empresa, isLoading, isError } = useEmpresaDetalle(id)
  const actualizar = useActualizarEmpresa()

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Partial<EmpresaAdmin>>({})
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (empresa) {
      setForm({
        nombre: empresa.nombre,
        nombre_comercial: empresa.nombre_comercial,
        plan: empresa.plan,
        tipo_negocio: empresa.tipo_negocio,
        rfc: empresa.rfc,
        email: empresa.email,
        telefono: empresa.telefono,
        activo: empresa.activo,
      })
    }
  }, [empresa])

  const handleSave = async () => {
    setSaveError('')
    setSaveSuccess(false)
    try {
      await actualizar.mutateAsync({ id, data: form })
      setSaveSuccess(true)
      setEditMode(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError(t('empresaDetail.saveError'))
    }
  }

  const handleCancel = () => {
    if (empresa) {
      setForm({
        nombre: empresa.nombre,
        nombre_comercial: empresa.nombre_comercial,
        plan: empresa.plan,
        tipo_negocio: empresa.tipo_negocio,
        rfc: empresa.rfc,
        email: empresa.email,
        telefono: empresa.telefono,
        activo: empresa.activo,
      })
    }
    setEditMode(false)
    setSaveError('')
  }

  const setF = (k: keyof EmpresaAdmin) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(480px, 95vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            background: 'var(--surface)',
            zIndex: 1,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
              {isLoading ? t('empresaDetail.loadingDetails') : empresa?.nombre ?? 'Empresa'}
            </h2>
            {empresa && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                {empresa.slug}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid var(--border)',
                  borderTopColor: 'var(--color-warning)',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  margin: '0 auto 12px',
                }}
              />
              {t('empresaDetail.loadingDetails')}
            </div>
          </div>
        )}

        {isError && (
          <div style={{ padding: 24, color: 'var(--color-error)', fontSize: 14 }}>
            {t('empresaDetail.loadError')}
          </div>
        )}

        {/* Content */}
        {empresa && !isLoading && (
          <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Success banner */}
            {saveSuccess && (
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: 'var(--color-success)',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('empresaDetail.saveSuccess')}
              </div>
            )}

            {/* ── VIEW MODE ── */}
            {!editMode && (
              <>
                {/* Status row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <PlanBadge plan={empresa.plan} />
                  <StatusBadge activo={empresa.activo} />
                </div>

                {/* Basic info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <InfoRow label={t('empresaDetail.labelNombre')}>{empresa.nombre}</InfoRow>
                  <InfoRow label={t('empresaDetail.labelNombreComercial')}>{empresa.nombre_comercial || '—'}</InfoRow>
                  <InfoRow label={t('empresaDetail.labelRfc')}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{empresa.rfc || '—'}</span>
                  </InfoRow>
                  <InfoRow label={t('empresaDetail.labelRazonSocial')}>{empresa.razon_social || '—'}</InfoRow>
                  <InfoRow label={t('empresaDetail.labelTipoNegocio')}>{t(`empresaDetail.tipos.${empresa.tipo_negocio}`, { defaultValue: empresa.tipo_negocio })}</InfoRow>
                  <InfoRow label={t('empresaDetail.labelSlug')}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{empresa.slug}</span>
                  </InfoRow>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <InfoRow label={t('empresaDetail.labelEmail')}>{empresa.email || '—'}</InfoRow>
                  <InfoRow label={t('empresaDetail.labelTelefono')}>{empresa.telefono || '—'}</InfoRow>
                  {empresa.direccion && <InfoRow label={t('empresaDetail.labelDireccion')}>{empresa.direccion}</InfoRow>}
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Meta */}
                <InfoRow label={t('empresaDetail.labelRegistro')}>
                  {new Date(empresa.fecha_registro).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </InfoRow>

                {/* Edit button */}
                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 10,
                      border: '1px solid rgba(245,158,11,0.4)',
                      background: 'rgba(245,158,11,0.08)',
                      color: 'var(--color-warning)',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.15)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.08)'
                    }}
                  >
                    {t('empresaDetail.edit')}
                  </button>
                </div>
              </>
            )}

            {/* ── EDIT MODE ── */}
            {editMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t('empresaDetail.labelNombre')}</label>
                    <input style={inputStyle} value={form.nombre ?? ''} onChange={setF('nombre')} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t('empresaDetail.labelNombreComercial')}</label>
                    <input style={inputStyle} value={form.nombre_comercial ?? ''} onChange={setF('nombre_comercial')} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t('empresaDetail.labelNombre')}</label>
                    <select
                      style={inputStyle}
                      value={form.plan ?? 'basico'}
                      onChange={setF('plan')}
                    >
                      <option value="basico">{t('empresaDetail.planes.basico')}</option>
                      <option value="profesional">{t('empresaDetail.planes.profesional')}</option>
                      <option value="empresarial">{t('empresaDetail.planes.empresarial')}</option>
                      <option value="elite">{t('empresaDetail.planes.elite')}</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t('empresaDetail.labelTipoNegocio')}</label>
                    <select
                      style={inputStyle}
                      value={form.tipo_negocio ?? 'informal'}
                      onChange={setF('tipo_negocio')}
                    >
                      <option value="informal">{t('empresaDetail.tipos.informal')}</option>
                      <option value="formal_simplificado">{t('empresaDetail.tipos.formal_simplificado')}</option>
                      <option value="formal_completo">{t('empresaDetail.tipos.formal_completo')}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>{t('empresaDetail.labelRfc')}</label>
                  <input
                    style={inputStyle}
                    value={form.rfc ?? ''}
                    onChange={e => setForm(p => ({ ...p, rfc: e.target.value.toUpperCase().slice(0, 13) }))}
                    maxLength={13}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t('empresaDetail.labelEmail')}</label>
                    <input style={inputStyle} type="email" value={form.email ?? ''} onChange={setF('email')} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t('empresaDetail.labelTelefono')}</label>
                    <input style={inputStyle} value={form.telefono ?? ''} onChange={setF('telefono')} />
                  </div>
                </div>

                {/* Activo toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 999,
                      border: 'none',
                      background: form.activo ? 'var(--color-success)' : 'var(--border)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: form.activo ? 22 : 2,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                    {form.activo ? t('empresaDetail.empresaActiva') : t('empresaDetail.empresaInactiva')}
                  </span>
                </div>

                {/* Error */}
                {saveError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 9,
                      background: 'var(--color-error-bg)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: 'var(--color-error)',
                      fontSize: 13,
                    }}
                  >
                    {saveError}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    onClick={handleCancel}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 9,
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    {t('empresaDetail.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={actualizar.isPending}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 9,
                      border: 'none',
                      background: actualizar.isPending ? 'rgba(245,158,11,0.5)' : 'var(--color-warning)',
                      color: '#1C1917',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: actualizar.isPending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {actualizar.isPending ? (
                      <>
                        <span
                          style={{
                            width: 13,
                            height: 13,
                            border: '2px solid rgba(28,25,23,0.3)',
                            borderTopColor: '#1C1917',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.7s linear infinite',
                          }}
                        />
                        {t('empresaDetail.saving')}
                      </>
                    ) : t('empresaDetail.save')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )

  return createPortal(content, document.body)
}
