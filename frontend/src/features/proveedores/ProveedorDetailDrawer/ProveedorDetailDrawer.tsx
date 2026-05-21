import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Pencil, Trash2, Phone, Mail, Globe, MapPin, Tag, CalendarDays } from 'lucide-react'
import { useProveedorDetalle } from '@/hooks/useProveedores'
import type { Proveedor } from '@/types/proveedores.types'

interface Props {
  id:        string
  onClose:   () => void
  onEdit:    (proveedor: Proveedor) => void
  onDelete:  () => void
  canEdit:   boolean
  canDelete: boolean
}

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  materia_prima: { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)' },
  servicios:     { bg: 'var(--color-info-bg)',  color: 'var(--color-info)' },
  equipos:       { bg: 'rgba(168,85,247,0.12)',  color: '#A855F7' },
  consumibles:   { bg: 'var(--color-success-bg)',   color: 'var(--color-success)' },
  otro:          { bg: 'rgba(156,163,175,0.12)', color: '#9CA3AF' },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export function ProveedorDetailDrawer({ id, onClose, onEdit, onDelete, canEdit, canDelete }: Props) {
  const { t } = useTranslation()
  const { data: proveedor, isLoading } = useProveedorDetalle(id)

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Panel lateral */}
      <div style={{
        position: 'fixed', top: 0, right: 0,
        height: '100%',
        width: 'min(460px, 100%)',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.25s ease',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {isLoading ? (
              <div style={{ height: 18, width: 140, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
            ) : (
              <>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {proveedor?.nombre_comercial}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {proveedor?.codigo && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {proveedor.codigo}
                    </span>
                  )}
                  {proveedor?.tipo_proveedor && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                      ...(TIPO_COLOR[proveedor.tipo_proveedor] ?? { bg: 'var(--surface)', color: 'var(--text-secondary)' }),
                    }}>
                      {t(`proveedorDetail.tiposProveedor.${proveedor.tipo_proveedor}`, { defaultValue: proveedor.tipo_proveedor })}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            {canEdit && (
              <button
                onClick={() => proveedor && onEdit(proveedor)}
                style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
              >
                <Pencil size={14} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--color-error-bg)', color: 'var(--color-error)', cursor: 'pointer', display: 'flex' }}
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 64, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : !proveedor ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('proveedorDetail.loadError')}</p>
            </div>
          ) : (
            <>
              {/* Términos comerciales */}
              {(proveedor.dias_credito > 0 || proveedor.dias_pronto_pago > 0 || Number(proveedor.descuento_pronto_pago) > 0) && (
                <Section title={t('proveedorDetail.sectionTerminos')}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {proveedor.dias_credito > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                          <CalendarDays size={13} color="var(--color-primary)" />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{proveedor.dias_credito}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{t('proveedorDetail.diasCredito')}</p>
                      </div>
                    )}
                    {proveedor.dias_pronto_pago > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                          <CalendarDays size={13} color="#F59E0B" />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{proveedor.dias_pronto_pago}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{t('proveedorDetail.diasPP')}</p>
                      </div>
                    )}
                    {Number(proveedor.descuento_pronto_pago) > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'rgba(24,174,145,0.08)', border: '1px solid rgba(24,174,145,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                          <Tag size={13} color="var(--color-primary)" />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>{Number(proveedor.descuento_pronto_pago)}%</p>
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{t('proveedorDetail.descPP')}</p>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Contacto */}
              {(proveedor.contacto_principal || proveedor.email || proveedor.telefono || proveedor.celular || proveedor.sitio_web) && (
                <Section title={t('proveedorDetail.sectionContacto')}>
                  {proveedor.contacto_principal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 80 }}>{t('proveedorDetail.contacto')}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{proveedor.contacto_principal}</span>
                    </div>
                  )}
                  {proveedor.email && (
                    <a href={`mailto:${proveedor.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontSize: 13, textDecoration: 'none' }}>
                      <Mail size={13} />
                      {proveedor.email}
                    </a>
                  )}
                  {proveedor.telefono && (
                    <a href={`tel:${proveedor.telefono}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 13, textDecoration: 'none' }}>
                      <Phone size={13} color="var(--text-secondary)" />
                      {proveedor.telefono}
                    </a>
                  )}
                  {proveedor.celular && (
                    <a href={`tel:${proveedor.celular}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 13, textDecoration: 'none' }}>
                      <Phone size={13} color="var(--text-secondary)" />
                      {proveedor.celular}
                    </a>
                  )}
                  {proveedor.sitio_web && (
                    <a href={proveedor.sitio_web} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontSize: 13, textDecoration: 'none' }}>
                      <Globe size={13} />
                      {proveedor.sitio_web}
                    </a>
                  )}
                </Section>
              )}

              {/* Datos fiscales */}
              {(proveedor.razon_social || proveedor.rfc) && (
                <Section title={t('proveedorDetail.sectionFiscal')}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: t('proveedorDetail.labelRazonSocial'), value: proveedor.razon_social },
                      { label: t('proveedorDetail.labelRfc'),         value: proveedor.rfc },
                      { label: t('proveedorDetail.labelTipoPersona'), value: t(`proveedorDetail.tipoPersona.${proveedor.tipo_persona}`, { defaultValue: proveedor.tipo_persona }) },
                    ].filter((r) => r.value).map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Dirección */}
              {proveedor.ciudad && (
                <Section title={t('proveedorDetail.sectionDireccion')}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <MapPin size={13} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                      {[
                        proveedor.calle && `${proveedor.calle}${proveedor.numero_exterior ? ' ' + proveedor.numero_exterior : ''}`,
                        proveedor.colonia,
                        proveedor.ciudad,
                        proveedor.estado,
                        proveedor.codigo_postal,
                        proveedor.pais,
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </Section>
              )}

              {/* Clasificación */}
              <Section title={t('proveedorDetail.sectionClasificacion')}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: t('proveedorDetail.labelTipoProveedor'), value: t(`proveedorDetail.tiposProveedor.${proveedor.tipo_proveedor}`, { defaultValue: '—' }) },
                    { label: t('proveedorDetail.labelCreado'),        value: new Date(proveedor.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
                    </div>
                  ))}
                  {proveedor.notas && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('proveedorDetail.labelNotas')}</p>
                      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{proveedor.notas}</p>
                    </div>
                  )}
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
