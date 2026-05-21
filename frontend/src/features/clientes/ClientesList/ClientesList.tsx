import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Filter, Eye, Pencil, Trash2, RefreshCw, Store } from 'lucide-react'
import { useClientes, useEliminarCliente } from '@/hooks/useClientes'
import { usePermissions } from '@/hooks/usePermissions'
import type { Cliente, ClienteLista, ClienteFiltros, TipoCliente } from '@/types/terceros.types'
import { ClienteFormModal } from '../ClienteFormModal/ClienteFormModal'
import { ClienteDetailDrawer } from '../ClienteDetailDrawer/ClienteDetailDrawer'

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  minorista:    { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  mayorista:    { bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
  distribuidor: { bg: 'rgba(168,85,247,0.12)',   color: '#A855F7' },
}

function TipoBadge({ tipo }: { tipo: string }) {
  const { t } = useTranslation()
  const TIPO_LABEL: Record<string, string> = {
    minorista:    t('clients.minorista'),
    mayorista:    t('clients.mayorista'),
    distribuidor: t('clients.distribuidor'),
  }
  if (!tipo) return <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
  const cfg = TIPO_COLOR[tipo] ?? { bg: 'var(--surface)', color: 'var(--text-secondary)' }
  return (
    <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...cfg }}>
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  )
}

function OrigenBadge({ origen }: { origen: string }) {
  if (origen !== 'storefront') return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, padding: '1px 7px',
      borderRadius: 999, background: 'rgba(139,92,246,0.12)', color: '#7C3AED',
      letterSpacing: '0.03em',
    }}>
      <Store size={9} />
      TIENDA
    </span>
  )
}

function CreditoBar({ disponible, limite }: { disponible: string; limite: string }) {
  const { t } = useTranslation()
  const lim = Number(limite)
  if (lim === 0) return <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('clients.noCredit')}</span>
  const pct = Math.min(100, (Number(disponible) / lim) * 100)
  const color = pct > 50 ? 'var(--color-success)' : pct > 20 ? 'var(--color-warning)' : 'var(--color-error)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 80 }}>
      <div style={{ height: 5, borderRadius: 999, background: 'var(--border)' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        ${Number(disponible).toLocaleString('es-MX', { maximumFractionDigits: 0 })} / ${Number(limite).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
      </span>
    </div>
  )
}

export function ClientesList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  const [filtros,       setFiltros]       = useState<ClienteFiltros>({})
  const [showFiltros,   setShowFiltros]   = useState(false)
  const [search,        setSearch]        = useState('')
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [selectedOrigen, setSelectedOrigen] = useState<'erp' | 'storefront'>('erp')
  const [showForm,      setShowForm]      = useState(false)
  const [editTarget,    setEditTarget]    = useState<Cliente | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<ClienteLista | null>(null)

  const { data, isLoading, refetch } = useClientes(filtros)
  const eliminar = useEliminarCliente()

  const todos = data?.results ?? []
  const filtrados = todos.filter((c) => {
    if (filtros.tipo_cliente && c.tipo_cliente !== filtros.tipo_cliente) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.nombre_comercial.toLowerCase().includes(q) ||
      c.rfc.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q)
    )
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await eliminar.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // silently ignore — user stays on same page
    }
  }

  if (!hasPermission('clientes.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('clients.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  return (
    <>
      {/* Modales / Drawer */}
      {(showForm || editTarget) && (
        <ClienteFormModal
          cliente={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSuccess={() => { setShowForm(false); setEditTarget(null); refetch() }}
        />
      )}

      {selectedId && (
        <ClienteDetailDrawer
          id={selectedId}
          origen={selectedOrigen}
          onClose={() => setSelectedId(null)}
          onEdit={(cliente) => {
            setSelectedId(null)
            setEditTarget(cliente)
          }}
          onDelete={() => {
            const c = todos.find((x) => x.id === selectedId) ?? null
            setSelectedId(null)
            setDeleteTarget(c)
          }}
          canEdit={hasPermission('clientes.editar')}
          canDelete={hasPermission('clientes.editar')}
        />
      )}

      {/* Confirm delete */}
      {deleteTarget && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.25)',
        }}>
          <div style={{
            width: 'min(400px, 90vw)', background: 'var(--surface)',
            borderRadius: 16, border: '1px solid var(--border)',
            padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 32px 80px rgba(0,0,0,0.3)', zIndex: 9999,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  {t('clients.deleteTitle')}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}
                  dangerouslySetInnerHTML={{ __html: t('clients.deleteConfirm', { name: deleteTarget.nombre_comercial }) }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={eliminar.isPending}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: eliminar.isPending ? 'var(--border)' : 'var(--color-error)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: eliminar.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {eliminar.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{t('clients.title')}</h1>
            <p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary)' }}>
              {data?.count ?? filtrados.length} {t('clients.registered')}
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
            {hasPermission('clientes.crear') && (
              <button
                onClick={() => { setEditTarget(null); setShowForm(true) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                {t('clients.newClient')}
              </button>
            )}
          </div>
        </div>

        {/* Búsqueda + filtros */}
        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('clients.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)',
                }}
              />
            </div>
            <button
              onClick={() => setShowFiltros(!showFiltros)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
                background: showFiltros ? 'var(--color-primary)' : 'var(--surface-hover)',
                color: showFiltros ? 'var(--color-primary-text)' : 'var(--text)',
              }}
            >
              <Filter size={14} />
              {t('common.filters')}
            </button>
          </div>

          {showFiltros && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('clients.type')}</label>
                <select
                  value={filtros.tipo_cliente ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, tipo_cliente: e.target.value as TipoCliente || undefined }))}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="">{t('clients.all')}</option>
                  <option value="minorista">{t('clients.minorista')}</option>
                  <option value="mayorista">{t('clients.mayorista')}</option>
                  <option value="distribuidor">{t('clients.distribuidor')}</option>
                </select>
              </div>

              <button
                onClick={() => setFiltros({})}
                style={{ alignSelf: 'flex-end', fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
              >
                {t('common.clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 48, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
              <span style={{ fontSize: 40 }}>👥</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {search || filtros.tipo_cliente ? t('clients.noResults') : t('clients.noClients')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {!search && !filtros.tipo_cliente && hasPermission('clientes.crear')
                  ? t('clients.addFirst')
                  : t('common.tryOtherSearch')}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    {[t('clients.columns.client'), t('clients.columns.contact'), t('clients.columns.type'), t('clients.columns.credit'), ''].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 16px',
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                        color: 'var(--text-secondary)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="data-row"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        opacity: cliente.activo ? 1 : 0.5,
                      }}
                      onClick={() => { setSelectedId(cliente.id); setSelectedOrigen(cliente.origen) }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <p style={{
                              fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0,
                              textDecoration: cliente.activo ? 'none' : 'line-through',
                            }}>
                              {cliente.nombre_comercial}
                            </p>
                            <OrigenBadge origen={cliente.origen} />
                            {!cliente.activo && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 6px',
                                borderRadius: 999, background: 'var(--color-error-bg)',
                                color: 'var(--color-error)', letterSpacing: '0.04em',
                              }}>
                                {t('clients.deleted')}
                              </span>
                            )}
                          </div>
                          {cliente.rfc && (
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                              {cliente.rfc}
                            </p>
                          )}
                          {cliente.codigo && (
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '1px 0 0' }}>
                              {cliente.codigo}
                            </p>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {cliente.email && (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cliente.email}</span>
                          )}
                          {cliente.telefono && (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cliente.telefono}</span>
                          )}
                          {!cliente.email && !cliente.telefono && (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <TipoBadge tipo={cliente.tipo_cliente} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {cliente.origen === 'erp'
                          ? <CreditoBar disponible={cliente.credito_disponible} limite={cliente.limite_credito} />
                          : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(cliente.id); setSelectedOrigen(cliente.origen) }}
                            title={t('common.see')}
                            aria-label={t('common.see')}
                            style={{ padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
                          >
                            <Eye size={13} />
                          </button>
                          {cliente.origen === 'erp' && hasPermission('clientes.editar') && cliente.activo && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedId(cliente.id)
                              }}
                              title={t('common.edit')}
                              aria-label={t('common.edit')}
                              style={{ padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {cliente.origen === 'erp' && hasPermission('clientes.editar') && cliente.activo && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(cliente) }}
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
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
      </div>
    </>
  )
}
