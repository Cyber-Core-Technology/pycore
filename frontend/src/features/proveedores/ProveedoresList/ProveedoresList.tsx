import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Filter, Eye, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useProveedores, useEliminarProveedor } from '@/hooks/useProveedores'
import { usePermissions } from '@/hooks/usePermissions'
import type { Proveedor, ProveedorLista, ProveedorFiltros, TipoProveedor } from '@/types/proveedores.types'
import { ProveedorFormModal } from '../ProveedorFormModal/ProveedorFormModal'
import { ProveedorDetailDrawer } from '../ProveedorDetailDrawer/ProveedorDetailDrawer'

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  materia_prima: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  servicios:     { bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
  equipos:       { bg: 'rgba(168,85,247,0.12)',   color: '#A855F7' },
  consumibles:   { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  otro:          { bg: 'rgba(156,163,175,0.12)',  color: '#9CA3AF' },
}

function TipoBadge({ tipo }: { tipo: string }) {
  const { t } = useTranslation()
  const tipoLabels: Record<string, string> = {
    materia_prima: t('providers.materiaPrima'),
    servicios:     t('providers.servicios'),
    equipos:       t('providers.equipos'),
    consumibles:   t('providers.consumibles'),
    otro:          t('providers.otro'),
  }
  if (!tipo) return <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
  const cfg = TIPO_COLOR[tipo] ?? { bg: 'var(--surface)', color: 'var(--text-secondary)' }
  return (
    <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...cfg }}>
      {tipoLabels[tipo] ?? tipo}
    </span>
  )
}

export function ProveedoresList() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  const [filtros,      setFiltros]      = useState<ProveedorFiltros>({})
  const [showFiltros,  setShowFiltros]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [showForm,     setShowForm]     = useState(false)
  const [editTarget,   setEditTarget]   = useState<Proveedor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProveedorLista | null>(null)

  const { data, isLoading, refetch } = useProveedores(filtros)
  const eliminar = useEliminarProveedor()

  const todos = data?.results ?? []
  const filtrados = todos.filter((p) => {
    if (filtros.tipo_proveedor && p.tipo_proveedor !== filtros.tipo_proveedor) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.nombre_comercial.toLowerCase().includes(q) ||
      p.rfc.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      p.contacto_principal.toLowerCase().includes(q)
    )
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await eliminar.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // silently ignore
    }
  }

  if (!hasPermission('proveedores.ver')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t('providers.noAccess')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('common.contactAdmin')}</p>
      </div>
    )
  }

  return (
    <>
      {(showForm || editTarget) && (
        <ProveedorFormModal
          proveedor={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSuccess={() => { setShowForm(false); setEditTarget(null); refetch() }}
        />
      )}

      {selectedId && (
        <ProveedorDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={(proveedor) => {
            setSelectedId(null)
            setEditTarget(proveedor)
          }}
          onDelete={() => {
            const p = todos.find((x) => x.id === selectedId) ?? null
            setSelectedId(null)
            setDeleteTarget(p)
          }}
          canEdit={hasPermission('proveedores.editar')}
          canDelete={hasPermission('proveedores.editar')}
        />
      )}

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
                  {t('providers.deleteTitle')}
                </h3>
                <p
                  style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}
                  dangerouslySetInnerHTML={{ __html: t('providers.deleteConfirm', { name: deleteTarget.nombre_comercial }) }}
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{t('providers.title')}</h1>
            <p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary)' }}>
              {data?.count ?? filtrados.length} {t('providers.registered')}
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
            {hasPermission('proveedores.crear') && (
              <button
                onClick={() => { setEditTarget(null); setShowForm(true) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                {t('providers.newProvider')}
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('providers.searchPlaceholder')}
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
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('providers.type')}</label>
                <select
                  value={filtros.tipo_proveedor ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, tipo_proveedor: e.target.value as TipoProveedor || undefined }))}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="">{t('providers.all')}</option>
                  <option value="materia_prima">{t('providers.materiaPrima')}</option>
                  <option value="servicios">{t('providers.servicios')}</option>
                  <option value="equipos">{t('providers.equipos')}</option>
                  <option value="consumibles">{t('providers.consumibles')}</option>
                  <option value="otro">{t('providers.otro')}</option>
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

        <div className="card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 48, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
              <span style={{ fontSize: 40 }}>🏭</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {search || filtros.tipo_proveedor ? t('common.noResults') : t('providers.noProviders')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {!search && !filtros.tipo_proveedor && hasPermission('proveedores.crear')
                  ? t('providers.addFirst')
                  : t('common.tryOtherSearch')}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    {[
                      t('providers.columns.provider'),
                      t('providers.columns.contact'),
                      t('providers.columns.type'),
                      t('providers.columns.credit'),
                      '',
                    ].map((h) => (
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
                  {filtrados.map((proveedor) => (
                    <tr
                      key={proveedor.id}
                      className="data-row"
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setSelectedId(proveedor.id)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                            {proveedor.nombre_comercial}
                          </p>
                          {proveedor.rfc && (
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                              {proveedor.rfc}
                            </p>
                          )}
                          {proveedor.codigo && (
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '1px 0 0' }}>
                              {proveedor.codigo}
                            </p>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {proveedor.contacto_principal && (
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{proveedor.contacto_principal}</span>
                          )}
                          {proveedor.email && (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{proveedor.email}</span>
                          )}
                          {proveedor.telefono && (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{proveedor.telefono}</span>
                          )}
                          {!proveedor.contacto_principal && !proveedor.email && !proveedor.telefono && (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <TipoBadge tipo={proveedor.tipo_proveedor} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {proveedor.dias_credito > 0 ? (
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {proveedor.dias_credito} {t('providers.days')}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('providers.cash')}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(proveedor.id) }}
                            title={t('common.see')}
                            aria-label={`${t('common.see')} ${proveedor.nombre_comercial}`}
                            style={{ padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
                          >
                            <Eye size={13} />
                          </button>
                          {hasPermission('proveedores.editar') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedId(proveedor.id) }}
                              title={t('common.edit')}
                              aria-label={`${t('common.edit')} ${proveedor.nombre_comercial}`}
                              style={{ padding: 6, borderRadius: 6, display: 'flex', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {hasPermission('proveedores.editar') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(proveedor) }}
                              title={t('common.delete')}
                              aria-label={`${t('common.delete')} ${proveedor.nombre_comercial}`}
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
