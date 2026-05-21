import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Star, MapPin, Phone, Mail, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { coreApi } from '@/api/core-api'
import type { Sucursal, SucursalPayload } from '@/api/core-api'
import { BackToConfig } from '../components/BackToConfig'

const inputStyle: React.CSSProperties = {
  width: '100%', maxWidth: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
  outline: 'none', background: 'var(--surface-hover)',
  border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box',
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

const sucDefault: SucursalPayload = {
  nombre: '', codigo: '', direccion: '', ciudad: '', estado: '', cp: '', telefono: '', email: '', es_principal: false,
}

function SucursalDrawer({ editing, onClose }: { editing: Sucursal | null; onClose: () => void }) {
  const { t } = useTranslation()
  const qc    = useQueryClient()
  const [form, setForm] = useState<SucursalPayload>(
    editing
      ? { nombre: editing.nombre, codigo: editing.codigo, direccion: editing.direccion, ciudad: editing.ciudad, estado: editing.estado, cp: editing.cp, telefono: editing.telefono, email: editing.email, es_principal: editing.es_principal }
      : sucDefault,
  )
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => editing
      ? coreApi.sucursales.actualizar(editing.id_sucursal, form)
      : coreApi.sucursales.crear(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sucursales'] }); qc.invalidateQueries({ queryKey: ['sucursales-config'] }); onClose() },
    onError:   () => setError(t('config.branches.saveError')),
  })

  const set = <K extends keyof SucursalPayload>(k: K, v: SucursalPayload[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setError(t('config.branches.nameRequired')); return }
    if (!form.codigo.trim()) { setError(t('config.branches.codeRequired')); return }
    setError(null)
    save.mutate()
  }

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 9998 }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? t('config.branches.editBranch') : t('config.branches.newBranchTitle')}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%',
          width: 'min(460px, 100%)', background: 'var(--surface)',
          borderLeft: '1px solid var(--border)', zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
          animation: 'slideInRight 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {editing ? t('config.branches.editBranch') : t('config.branches.newBranchTitle')}
          </p>
          <button onClick={onClose} aria-label={t('common.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <p role="alert" style={{ fontSize: 13, color: 'var(--color-error)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label={t('config.branches.nameLabel')} id="suc-nombre">
                <input id="suc-nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inputStyle} placeholder="Ej. Sucursal Centro" autoFocus />
              </Field>
            </div>
            <Field label={t('config.branches.codeLabel')} id="suc-codigo">
              <input id="suc-codigo" value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())} style={inputStyle} placeholder="Ej. SUC002" />
            </Field>
            <Field label={t('common.phone')} id="suc-tel">
              <input id="suc-tel" type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} style={inputStyle} placeholder="55 1234 5678" />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label={t('common.email')} id="suc-email">
                <input id="suc-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="sucursal@negocio.com" />
              </Field>
            </div>
          </div>

          {/* Dirección */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('common.address')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label={t('config.branches.streetAndNumber')} id="suc-dir">
                <input id="suc-dir" value={form.direccion} onChange={e => set('direccion', e.target.value)} style={inputStyle} placeholder="Av. Principal 123" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <Field label={t('common.city')} id="suc-ciudad">
                  <input id="suc-ciudad" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} style={inputStyle} placeholder="CDMX" />
                </Field>
                <Field label={t('common.state')} id="suc-estado">
                  <input id="suc-estado" value={form.estado} onChange={e => set('estado', e.target.value)} style={inputStyle} placeholder="JAL" />
                </Field>
                <Field label={t('common.zip')} id="suc-cp">
                  <input id="suc-cp" value={form.cp} onChange={e => set('cp', e.target.value)} style={inputStyle} placeholder="44100" maxLength={5} />
                </Field>
              </div>
            </div>
          </div>

          {/* Principal */}
          {!editing?.es_principal && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t('config.branches.markAsPrincipal')}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{t('config.branches.principalHint')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.es_principal}
                aria-label={t('config.branches.markAsPrincipal')}
                onClick={() => set('es_principal', !form.es_principal)}
                style={{
                  width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: form.es_principal ? 'var(--color-primary)' : 'var(--border)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: form.es_principal ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: form.es_principal ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={save.isPending}
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: save.isPending ? 'not-allowed' : 'pointer', opacity: save.isPending ? 0.7 : 1 }}
          >
            {save.isPending ? t('common.saving') : <><Check size={14} aria-hidden="true" /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

function SucursalCard({ sucursal, onEdit, onDelete }: { sucursal: Sucursal; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState(false)

  return (
    <article
      aria-label={sucursal.nombre}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sucursal.nombre}
            </p>
            {sucursal.es_principal && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: 'var(--color-warning)', background: 'rgba(245,158,11,0.1)', padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>
                <Star size={10} aria-hidden="true" /> {t('config.branches.principal')}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{sucursal.codigo}</p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={onEdit} aria-label={`${t('common.edit')} ${sucursal.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 5, borderRadius: 6 }}>
            <Pencil size={14} />
          </button>
          {!sucursal.es_principal && (
            confirm ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={onDelete} aria-label={t('common.confirm')} style={{ background: 'var(--color-error)', border: 'none', cursor: 'pointer', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>{t('common.yes')}</button>
                <button onClick={() => setConfirm(false)} aria-label={t('common.cancel')} style={{ background: 'var(--surface-hover)', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>{t('common.no')}</button>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)} aria-label={`${t('common.delete')} ${sucursal.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 5, borderRadius: 6 }}>
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Contact info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(sucursal.direccion || sucursal.ciudad) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <span>{[sucursal.direccion, sucursal.ciudad, sucursal.estado].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {sucursal.telefono && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <Phone size={13} aria-hidden="true" />
            <span>{sucursal.telefono}</span>
          </div>
        )}
        {sucursal.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <Mail size={13} aria-hidden="true" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sucursal.email}</span>
          </div>
        )}
      </div>
    </article>
  )
}

export function SucursalesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Sucursal | null }>({ open: false, editing: null })

  const { data: sucursales = [], isLoading } = useQuery({
    queryKey: ['sucursales'],
    queryFn:  coreApi.sucursales.listar,
  })

  const del = useMutation({
    mutationFn: (id: string) => coreApi.sucursales.eliminar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sucursales'] }); qc.invalidateQueries({ queryKey: ['sucursales-config'] }) },
  })

  const openNew    = () => setDrawer({ open: true, editing: null })
  const openEdit   = (s: Sucursal) => setDrawer({ open: true, editing: s })
  const closeDrawer = () => setDrawer({ open: false, editing: null })

  return (
    <main style={{ padding: '20px 0 60px', maxWidth: 960, margin: '0 auto' }}>
      <BackToConfig />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('config.branches.title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('config.branches.subtitle')}
          </p>
        </div>
        <button
          onClick={openNew}
          aria-label={t('config.branches.newBranch')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer', flexShrink: 0 }}
        >
          <Plus size={15} aria-hidden="true" /> {t('config.branches.newBranch')}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('config.branches.loading')}</p>
      ) : sucursales.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t('config.branches.noBranches')}</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('config.branches.noBranchesHint')}</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}
          role="list"
        >
          {sucursales.map(s => (
            <div key={s.id_sucursal} role="listitem">
              <SucursalCard
                sucursal={s}
                onEdit={() => openEdit(s)}
                onDelete={() => del.mutate(s.id_sucursal)}
              />
            </div>
          ))}
        </div>
      )}

      {drawer.open && (
        <SucursalDrawer editing={drawer.editing} onClose={closeDrawer} />
      )}
    </main>
  )
}
