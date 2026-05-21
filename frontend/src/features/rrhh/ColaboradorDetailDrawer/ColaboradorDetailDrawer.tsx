import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Edit2, UserMinus, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useColaboradorDetalle, useDarBajaColaborador } from '@/hooks/useColaboradores'
import type { Colaborador, EstadoColaborador } from '@/types/rrhh.types'

interface Props {
  id: string
  onClose: () => void
  onEdit: (c: Colaborador) => void
  canEdit: boolean
  canDarBaja: boolean
}

const ESTADO_STYLE: Record<EstadoColaborador, { bg: string; color: string }> = {
  activo:      { bg: '#D1FAE5', color: '#065F46' },
  baja:        { bg: '#FEE2E2', color: '#991B1B' },
  vacaciones:  { bg: '#DBEAFE', color: '#1E40AF' },
  incapacidad: { bg: '#FEF3C7', color: '#92400E' },
}

function EstadoBadge({ estado }: { estado: EstadoColaborador }) {
  const { t } = useTranslation()
  const cfg = ESTADO_STYLE[estado] ?? { bg: '#F3F4F6', color: '#374151' }
  return (
    <span style={{
      padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      {t(`colaboradorDetail.estados.${estado}`, { defaultValue: estado })}
    </span>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <p style={{
      margin: '20px 0 8px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
      color: 'var(--text-secondary)', textTransform: 'uppercase',
      borderBottom: '1px solid var(--border)', paddingBottom: 6,
    }}>
      {title}
    </p>
  )
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

const fmt = (val?: string | null) =>
  val ? Number(val).toLocaleString(undefined, { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }) : '—'

export function ColaboradorDetailDrawer({ id, onClose, onEdit, canEdit, canDarBaja }: Props) {
  const { t } = useTranslation()
  const { data: colaborador, isLoading } = useColaboradorDetalle(id)
  const darBajaMutation = useDarBajaColaborador()

  const [showBajaConfirm, setShowBajaConfirm] = useState(false)
  const [fechaBaja, setFechaBaja] = useState(new Date().toISOString().slice(0, 10))
  const [bajaError, setBajaError] = useState<string | null>(null)

  const handleDarBaja = async () => {
    setBajaError(null)
    try {
      await darBajaMutation.mutateAsync({ id, fecha_baja: fechaBaja })
      onClose()
    } catch {
      setBajaError(t('colaboradorDetail.bajaError'))
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 9998,
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '100%', maxWidth: 480,
          zIndex: 9999,
          background: 'var(--surface)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {t('colaboradorDetail.title')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6, display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
            </div>
          ) : !colaborador ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 60 }}>
              {t('colaboradorDetail.notFound')}
            </div>
          ) : (
            <>
              {/* Name + estado */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                    {colaborador.nombre_completo}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    #{colaborador.numero_empleado}
                  </p>
                </div>
                <EstadoBadge estado={colaborador.estado} />
              </div>

              {/* Laboral */}
              <SectionTitle title={t('colaboradorDetail.laboralTitle')} />
              <DataRow label={t('colaboradorDetail.puesto')}          value={colaborador.puesto} />
              <DataRow label={t('colaboradorDetail.departamento')}    value={colaborador.departamento} />
              <DataRow label={t('colaboradorDetail.tipoContrato')} value={t(`colaboradorDetail.tipoContratoLabels.${colaborador.tipo_contrato}`, { defaultValue: colaborador.tipo_contrato })} />
              <DataRow label={t('colaboradorDetail.fechaIngreso')} value={fmtDate(colaborador.fecha_ingreso)} />
              <DataRow label={t('colaboradorDetail.salarioDiario')}   value={fmt(colaborador.salario_diario)} />
              {colaborador.sucursal && <DataRow label={t('colaboradorDetail.sucursalLabel')} value={colaborador.sucursal} />}
              {colaborador.fecha_baja && <DataRow label={t('colaboradorDetail.fechaBajaLabel')} value={fmtDate(colaborador.fecha_baja)} />}

              {/* Contacto */}
              <SectionTitle title={t('colaboradorDetail.contactoTitle')} />
              <DataRow label={t('colaboradorDetail.emailLabel')} value={colaborador.email} />
              <DataRow label={t('colaboradorDetail.telefonoLabel')}           value={colaborador.telefono} />

              {/* Datos personales */}
              <SectionTitle title={t('colaboradorDetail.personalTitle')} />
              <DataRow label={t('colaboradorDetail.fechaNacimiento')} value={fmtDate(colaborador.fecha_nacimiento)} />
              <DataRow label={t('colaboradorDetail.curp')}                value={colaborador.curp} />
              <DataRow label={t('colaboradorDetail.rfc')}                 value={colaborador.rfc} />
              <DataRow label={t('colaboradorDetail.nss')}                 value={colaborador.nss} />

              {/* Acceso al sistema */}
              <SectionTitle title={t('colaboradorDetail.accesoTitle')} />
              {colaborador.usuario_id ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success)',
                }}>
                  <ShieldCheck size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>
                      @{colaborador.usuario_username}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {colaborador.usuario_email}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                }}>
                  <ShieldOff size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {t('colaboradorDetail.noAcceso')}
                  </p>
                </div>
              )}

              {/* Dar de baja inline confirm */}
              {showBajaConfirm && colaborador.estado === 'activo' && (
                <div style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 10,
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#991B1B' }}>
                    {t('colaboradorDetail.bajaTitle')}
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: 12, color: '#DC2626' }}>
                    {t('colaboradorDetail.bajaDesc')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#991B1B' }}>{t('colaboradorDetail.bajaFecha')}</label>
                    <input
                      type="date"
                      value={fechaBaja}
                      onChange={(e) => setFechaBaja(e.target.value)}
                      style={{
                        padding: '8px 12px', borderRadius: 8, fontSize: 13,
                        border: '1px solid #FCA5A5', background: '#fff', color: '#1F2937',
                        outline: 'none',
                      }}
                    />
                  </div>
                  {bajaError && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#DC2626' }}>{bajaError}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      onClick={() => { setShowBajaConfirm(false); setBajaError(null) }}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
                        background: '#fff', border: '1px solid #FCA5A5', color: '#DC2626', cursor: 'pointer',
                      }}
                    >
                      {t('colaboradorDetail.bajaCancelBtn')}
                    </button>
                    <button
                      onClick={handleDarBaja}
                      disabled={darBajaMutation.isPending}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: darBajaMutation.isPending ? '#FCA5A5' : '#DC2626',
                        border: 'none', color: '#fff', cursor: darBajaMutation.isPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {darBajaMutation.isPending ? t('colaboradorDetail.bajaPending') : t('colaboradorDetail.bajaConfirmBtn')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {colaborador && !showBajaConfirm && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
          }}>
            {canDarBaja && colaborador.estado === 'activo' && (
              <button
                onClick={() => setShowBajaConfirm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', cursor: 'pointer',
                }}
              >
                <UserMinus size={14} />
                {t('colaboradorDetail.darDeBaja')}
              </button>
            )}
            <div style={{ flex: 1 }} />
            {canEdit && (
              <button
                onClick={() => onEdit(colaborador)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--color-primary)', border: 'none', color: 'var(--color-primary-text)', cursor: 'pointer',
                }}
              >
                <Edit2 size={14} />
                {t('colaboradorDetail.edit')}
              </button>
            )}
          </div>
        )}
      </div>
    </>,
    document.body
  )
}
