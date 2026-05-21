import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Pencil, Trash2, Phone, Mail, Globe, MapPin, CreditCard, Tag, Store, ShoppingBag } from 'lucide-react'
import { useClienteDetalle, useClienteStorefrontDetalle } from '@/hooks/useClientes'
import type { Cliente, OrigenCliente } from '@/types/terceros.types'

interface Props {
  id:        string
  origen:    OrigenCliente
  onClose:   () => void
  onEdit:    (cliente: Cliente) => void
  onDelete:  () => void
  canEdit:   boolean
  canDelete: boolean
}

const TIPO_CLIENTE_COLOR: Record<string, { bg: string; color: string }> = {
  minorista:    { bg: 'var(--color-success-bg)',  color: 'var(--color-success)' },
  mayorista:    { bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
  distribuidor: { bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
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

export function ClienteDetailDrawer({ id, origen, onClose, onEdit, onDelete, canEdit, canDelete }: Props) {
  const { t } = useTranslation()
  const { data: clienteERP,  isLoading: loadingERP }  = useClienteDetalle(origen === 'erp' ? id : null)
  const { data: clienteSF,   isLoading: loadingSF }   = useClienteStorefrontDetalle(origen === 'storefront' ? id : null)

  const isLoading = origen === 'erp' ? loadingERP : loadingSF

  const creditoPct = clienteERP && Number(clienteERP.limite_credito) > 0
    ? Math.min(100, (Number(clienteERP.credito_disponible) / Number(clienteERP.limite_credito)) * 100)
    : 0

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
                  {origen === 'erp' ? clienteERP?.nombre_comercial : clienteSF?.nombre}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {origen === 'erp' && clienteERP?.codigo && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {clienteERP.codigo}
                    </span>
                  )}
                  {origen === 'erp' && clienteERP?.tipo_cliente && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                      ...(TIPO_CLIENTE_COLOR[clienteERP.tipo_cliente] ?? { bg: 'var(--surface)', color: 'var(--text-secondary)' }),
                    }}>
                      {t(`clienteDetail.tipoCliente.${clienteERP.tipo_cliente}`, { defaultValue: clienteERP.tipo_cliente })}
                    </span>
                  )}
                  {origen === 'storefront' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}>
                      <Store size={9} /> {t('clienteDetail.onlineStoreBadge')}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            {origen === 'erp' && canEdit && (
              <button
                onClick={() => clienteERP && onEdit(clienteERP)}
                title={t('clienteDetail.editarTitle')}
                style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
              >
                <Pencil size={14} />
              </button>
            )}
            {origen === 'erp' && canDelete && (
              <button
                onClick={onDelete}
                title={t('clienteDetail.eliminarTitle')}
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
          ) : origen === 'storefront' && !clienteSF ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('clienteDetail.loadError')}</p>
            </div>
          ) : origen === 'erp' && !clienteERP ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('clienteDetail.loadError')}</p>
            </div>
          ) : origen === 'storefront' && clienteSF ? (
            // ── Vista de cliente Storefront ──────────────────────────────
            <>
              <Section title={t('clienteDetail.sectionOnline')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href={`mailto:${clienteSF.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontSize: 13, textDecoration: 'none' }}>
                    <Mail size={13} /> {clienteSF.email}
                  </a>
                  {clienteSF.telefono && (
                    <a href={`tel:${clienteSF.telefono}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 13, textDecoration: 'none' }}>
                      <Phone size={13} color="var(--text-secondary)" /> {clienteSF.telefono}
                    </a>
                  )}
                  <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('clienteDetail.emailVerificado')}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: clienteSF.email_verificado ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {clienteSF.email_verificado ? t('clienteDetail.siVerificado') : t('clienteDetail.noVerificado')}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('clienteDetail.pedidos')}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShoppingBag size={12} color="var(--text-secondary)" /> {clienteSF.num_pedidos}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('clienteDetail.registrado')}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {new Date(clienteSF.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              </Section>

              {(clienteSF.razon_social || clienteSF.rfc || clienteSF.regimen_fiscal) && (
                <Section title={t('clienteDetail.sectionFiscal')}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: t('clienteDetail.labelRazonSocial'), value: clienteSF.razon_social },
                      { label: t('clienteDetail.labelRfc'),          value: clienteSF.rfc },
                      { label: t('clienteDetail.labelRegimen'),       value: clienteSF.regimen_fiscal },
                      { label: t('clienteDetail.labelTipoPersona'),   value: t(`clienteDetail.tipoPersona.${clienteSF.tipo_persona}`, { defaultValue: clienteSF.tipo_persona ?? '' }) },
                    ].filter((r) => r.value).map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {clienteSF.ciudad && (
                <Section title={t('clienteDetail.sectionDireccion')}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <MapPin size={13} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                      {[
                        clienteSF.calle && `${clienteSF.calle}${clienteSF.numero_exterior ? ' ' + clienteSF.numero_exterior : ''}`,
                        clienteSF.colonia, clienteSF.ciudad, clienteSF.estado,
                        clienteSF.codigo_postal, clienteSF.pais,
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </Section>
              )}
            </>
          ) : clienteERP ? (
            // ── Vista de cliente ERP ─────────────────────────────────────
            <>
              {clienteERP.tiene_credito && (
                <Section title={t('clienteDetail.sectionCredito')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CreditCard size={13} color="var(--color-primary)" />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('clienteDetail.disponible')}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>
                      ${Number(clienteERP.credito_disponible).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--border)' }}>
                    <div style={{
                      height: '100%', borderRadius: 999, width: `${creditoPct}%`,
                      background: creditoPct > 50 ? 'var(--color-success)' : creditoPct > 20 ? 'var(--color-warning)' : 'var(--color-error)',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {t('clienteDetail.labelLimite', { monto: Number(clienteERP.limite_credito).toLocaleString(undefined) })}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {t('clienteDetail.diasLabel', { dias: clienteERP.dias_credito })}
                    </span>
                  </div>
                </Section>
              )}

              {(clienteERP.email || clienteERP.telefono || clienteERP.celular || clienteERP.sitio_web) && (
                <Section title={t('clienteDetail.sectionContacto')}>
                  {clienteERP.email && (
                    <a href={`mailto:${clienteERP.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontSize: 13, textDecoration: 'none' }}>
                      <Mail size={13} /> {clienteERP.email}
                    </a>
                  )}
                  {clienteERP.telefono && (
                    <a href={`tel:${clienteERP.telefono}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 13, textDecoration: 'none' }}>
                      <Phone size={13} color="var(--text-secondary)" /> {clienteERP.telefono}
                    </a>
                  )}
                  {clienteERP.celular && (
                    <a href={`tel:${clienteERP.celular}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 13, textDecoration: 'none' }}>
                      <Phone size={13} color="var(--text-secondary)" /> {clienteERP.celular} {t('clienteDetail.cel')}
                    </a>
                  )}
                  {clienteERP.sitio_web && (
                    <a href={clienteERP.sitio_web} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontSize: 13, textDecoration: 'none' }}>
                      <Globe size={13} /> {clienteERP.sitio_web}
                    </a>
                  )}
                </Section>
              )}

              {(clienteERP.razon_social || clienteERP.rfc || clienteERP.regimen_fiscal) && (
                <Section title={t('clienteDetail.sectionFiscal')}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: t('clienteDetail.labelRazonSocial'), value: clienteERP.razon_social },
                      { label: t('clienteDetail.labelRfc'),          value: clienteERP.rfc },
                      { label: t('clienteDetail.labelRegimen'),       value: clienteERP.regimen_fiscal },
                      { label: t('clienteDetail.labelTipoPersona'),   value: t(`clienteDetail.tipoPersona.${clienteERP.tipo_persona}`, { defaultValue: clienteERP.tipo_persona ?? '' }) },
                    ].filter((r) => r.value).map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {clienteERP.ciudad && (
                <Section title={t('clienteDetail.sectionDireccion')}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <MapPin size={13} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                      {[
                        clienteERP.calle && `${clienteERP.calle}${clienteERP.numero_exterior ? ' ' + clienteERP.numero_exterior : ''}`,
                        clienteERP.colonia, clienteERP.ciudad, clienteERP.estado,
                        clienteERP.codigo_postal, clienteERP.pais,
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </Section>
              )}

              <Section title={t('clienteDetail.sectionClasificacion')}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: t('clienteDetail.labelTipoCliente'), value: t(`clienteDetail.tipoCliente.${clienteERP.tipo_cliente}`, { defaultValue: '—' }) },
                    { label: t('clienteDetail.labelDescuento'),    value: Number(clienteERP.descuento_predeterminado) > 0 ? `${Number(clienteERP.descuento_predeterminado)}%` : '—' },
                    { label: t('clienteDetail.labelCreado'),       value: new Date(clienteERP.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
                    </div>
                  ))}
                  {clienteERP.notas && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('clienteDetail.labelNotas')}</p>
                      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{clienteERP.notas}</p>
                    </div>
                  )}
                </div>
              </Section>

              {Number(clienteERP.descuento_predeterminado) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(24,174,145,0.08)', border: '1px solid rgba(24,174,145,0.2)' }}>
                  <Tag size={13} color="var(--color-primary)" />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('clienteDetail.descuentoPredeterminado')} <strong style={{ color: 'var(--color-primary)' }}>{Number(clienteERP.descuento_predeterminado)}%</strong>
                  </span>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>,
    document.body
  )
}
