import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Users, Plus, X, MapPin } from 'lucide-react'
import { usuariosApi } from '@/api/usuarios-api'
import type { UsuarioEmpresa, CrearUsuarioPayload } from '@/api/usuarios-api'
import { coreApi } from '@/api/core-api'
import { useModules } from '@/hooks/useModules'
import { PLAN_LABELS } from '@/hooks/useModules'
import { OrgTree } from './OrgTree'
import { BackToConfig } from '../components/BackToConfig'

// ─── Role constants ───────────────────────────────────────────────────────────
const ROLE_VALUES = ['Administrador', 'Vendedor', 'Contador', 'Almacenista', 'Consultor'] as const
type RoleValue = typeof ROLE_VALUES[number]

const ROLE_COLORS: Record<string, string> = {
  Administrador: '#10B981',
  Vendedor:      'var(--color-info)',
  Contador:      '#8B5CF6',
  Almacenista:   'var(--color-warning)',
  Consultor:     '#6B7280',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  background: 'var(--surface-hover)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  boxSizing: 'border-box',
}

// ─── Add User Modal ──────────────────────────────────────────────────────────
function AddUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CrearUsuarioPayload>({
    nombre:           '',
    apellido_paterno: '',
    apellido_materno: '',
    email:            '',
    username:         '',
    password:         '',
    password_confirm: '',
    roles:            ['Vendedor'],
  })

  const crear = useMutation({
    mutationFn: () => usuariosApi.crear(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onSuccess()
    },
    onError: (err: unknown) => {
      const anyErr = err as { response?: { data?: Record<string, string[]> } }
      const detail = anyErr?.response?.data
      if (detail) {
        const msgs = Object.values(detail).flat()
        setError(msgs.join(' ') || t('config.users.errorCreate'))
      } else {
        setError(t('config.users.errorCreate'))
      }
    },
  })

  const set = <K extends keyof CrearUsuarioPayload>(key: K, val: CrearUsuarioPayload[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.password_confirm) {
      setError(t('config.users.passwordMismatch'))
      return
    }
    if (form.roles.length === 0) {
      setError(t('config.users.noRoleSelected'))
      return
    }
    crear.mutate()
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          position: 'fixed', zIndex: 9999,
          width: 'min(520px, 95vw)', maxHeight: '90vh',
          background: 'var(--surface)', borderRadius: 16,
          border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('config.users.newUserTitle')}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('config.users.newUserSubtitle')}</p>
          </div>
          <button onClick={onClose} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.firstName')} *</label>
              <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.lastName')} *</label>
              <input type="text" value={form.apellido_paterno} onChange={(e) => set('apellido_paterno', e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.motherLastName')}</label>
            <input type="text" value={form.apellido_materno ?? ''} onChange={(e) => set('apellido_materno', e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.email')} *</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.username')} *</label>
              <input type="text" value={form.username} onChange={(e) => set('username', e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.password')} *</label>
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.confirmPassword')} *</label>
              <input type="password" value={form.password_confirm} onChange={(e) => set('password_confirm', e.target.value)} style={inputStyle} required />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>{t('config.users.rolesSection')} *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ROLE_VALUES.map((rv) => {
                const selected = form.roles.includes(rv)
                const roleLabel = t(`config.users.roleDescriptions.${rv}.label`, { defaultValue: rv })
                const roleDesc  = t(`config.users.roleDescriptions.${rv}.desc`,  { defaultValue: '' })
                return (
                  <button
                    key={rv}
                    type="button"
                    onClick={() => toggleRole(rv)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                      border: selected ? `1px solid ${ROLE_COLORS[rv]}40` : '1px solid var(--border)',
                      background: selected ? `${ROLE_COLORS[rv]}12` : 'var(--surface-hover)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      border: selected ? `2px solid ${ROLE_COLORS[rv]}` : '2px solid var(--border)',
                      background: selected ? ROLE_COLORS[rv] : 'transparent',
                    }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{roleLabel}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{roleDesc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={crear.isPending} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: crear.isPending ? 'var(--border)' : 'var(--color-primary)', color: 'var(--color-primary-text)', fontSize: 13, fontWeight: 600, cursor: crear.isPending ? 'not-allowed' : 'pointer' }}>
              {crear.isPending ? t('config.users.creating') : t('config.users.createUser')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({
  usuario,
  todos,
  onClose,
}: {
  usuario: UsuarioEmpresa
  todos:   UsuarioEmpresa[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const parts = usuario.nombre_completo.trim().split(' ')
  const [nombre,   setNombre]   = useState(parts[0] ?? '')
  const [apPat,    setApPat]    = useState(parts[1] ?? '')
  const [apMat,    setApMat]    = useState(parts.slice(2).join(' '))
  const [email,    setEmail]    = useState(usuario.email)
  const [telefono, setTelefono] = useState('')
  const [roles,    setRoles]    = useState(usuario.roles)
  const [jefeId,   setJefeId]   = useState<string>(usuario.jefe_id ?? '')
  const [selectedSucursales, setSelectedSucursales] = useState<string[]>([])

  const { data: todasSucursales = [] } = useQuery({
    queryKey: ['sucursales-empresa'],
    queryFn: () => coreApi.sucursales.listar(),
  })

  const { data: sucursalesUsuario = [] } = useQuery({
    queryKey: ['usuario-sucursales', usuario.id],
    queryFn: () => usuariosApi.getSucursales(usuario.id),
  })

  useEffect(() => {
    setSelectedSucursales(sucursalesUsuario.map((s) => s.id_sucursal))
  }, [sucursalesUsuario])

  const toggleSucursal = (id: string) =>
    setSelectedSucursales((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )

  const actualizar = useMutation({
    mutationFn: async () => {
      await usuariosApi.actualizarRoles(usuario.id, {
        nombre,
        apellido_paterno: apPat,
        apellido_materno: apMat,
        email,
        ...(telefono ? { telefono } : {}),
        roles,
        jefe_id: jefeId || null,
      })
      await usuariosApi.setSucursales(usuario.id, selectedSucursales)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuario-sucursales', usuario.id] })
      onClose()
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? t('config.users.errorSave'))
    },
  })

  const toggleRole = (role: string) =>
    setRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role])

  const candidatos = todos.filter((u) => u.id !== usuario.id && u.is_active)

  const section = (label: string) => (
    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', margin: '4px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </p>
  )

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ position: 'relative', zIndex: 9999, width: 'min(500px, 95vw)', maxHeight: '90vh', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('config.users.editUserTitle')}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{usuario.email}</p>
          </div>
          <button onClick={onClose} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {section(t('config.users.personalData'))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.firstName')} *</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.lastName')}</label>
              <input value={apPat} onChange={(e) => setApPat(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.motherLastName')}</label>
              <input value={apMat} onChange={(e) => setApMat(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.phone')}</label>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder={t('config.users.optional')} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>

          {section(t('config.users.hierarchy'))}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('config.users.reportsTo')}</label>
            <select value={jefeId} onChange={(e) => setJefeId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">{t('config.users.noDirectManager')}</option>
              {candidatos.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre_completo}{u.roles[0] ? ` · ${u.roles[0]}` : ''}
                </option>
              ))}
            </select>
          </div>

          {section(t('config.users.rolesSection'))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {ROLE_VALUES.map((rv) => {
              const selected = roles.includes(rv)
              const roleLabel = t(`config.users.roleDescriptions.${rv}.label`, { defaultValue: rv })
              const roleDesc  = t(`config.users.roleDescriptions.${rv}.desc`,  { defaultValue: '' })
              return (
                <button
                  key={rv}
                  type="button"
                  onClick={() => toggleRole(rv)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: selected ? `1px solid ${ROLE_COLORS[rv]}40` : '1px solid var(--border)', background: selected ? `${ROLE_COLORS[rv]}12` : 'var(--surface-hover)', textAlign: 'left' }}
                >
                  <div style={{ width: 13, height: 13, borderRadius: 4, flexShrink: 0, border: selected ? `2px solid ${ROLE_COLORS[rv]}` : '2px solid var(--border)', background: selected ? ROLE_COLORS[rv] : 'transparent' }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{roleLabel}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{roleDesc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {section(t('config.users.branchAccess'))}
          {todasSucursales.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{t('config.users.noBranches')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {todasSucursales.map((s: any) => {
                const id = s.id_sucursal ?? s.id
                const sel = selectedSucursales.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleSucursal(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      border: sel ? '1px solid rgba(24,174,145,0.35)' : '1px solid var(--border)',
                      background: sel ? 'rgba(24,174,145,0.08)' : 'var(--surface-hover)',
                    }}
                  >
                    <div style={{ width: 13, height: 13, borderRadius: 4, flexShrink: 0, border: sel ? '2px solid var(--color-primary)' : '2px solid var(--border)', background: sel ? 'var(--color-primary)' : 'transparent' }} />
                    <MapPin size={13} style={{ color: sel ? 'var(--color-primary)' : 'var(--text-secondary)', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                        {s.nombre}
                        {s.es_principal && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-primary)', fontWeight: 500 }}>{t('config.users.principalBadge')}</span>}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{t('config.users.codeLabel', { code: s.codigo })}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {selectedSucursales.length === 0 && todasSucursales.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--color-error)', margin: '-8px 0 0' }}>
              {t('config.users.noAccessWarning')}
            </p>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={() => { setError(null); actualizar.mutate() }}
            disabled={actualizar.isPending || !nombre.trim()}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: actualizar.isPending ? 0.7 : 1 }}
          >
            {actualizar.isPending ? t('config.users.saving') : t('config.users.saveChanges')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function UsuariosPage() {
  const { t } = useTranslation()
  const [showAdd,    setShowAdd]    = useState(false)
  const [editTarget, setEditTarget] = useState<UsuarioEmpresa | null>(null)
  const { limits, plan } = useModules()

  const qc = useQueryClient()
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.listar,
  })

  const darBaja = useMutation({
    mutationFn: (id: string) => usuariosApi.darBaja(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const reordenar = useMutation({
    mutationFn: ({ userId, newJefeId, roles }: { userId: string; newJefeId: string | null; roles: string[] }) =>
      usuariosApi.actualizarRoles(userId, { jefe_id: newJefeId, roles }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const handleBaja = (u: UsuarioEmpresa) => {
    if (confirm(t('config.users.deactivateConfirm', { name: u.nombre_completo }))) darBaja.mutate(u.id)
  }

  const handleReorder = (userId: string, newJefeId: string | null) => {
    const u = usuarios.find((x) => x.id === userId)
    if (!u) return
    reordenar.mutate({ userId, newJefeId, roles: u.roles })
  }

  const planLabel = PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan
  const limite    = limits.maxUsuarios
  const usados    = usuarios.length
  const pct       = limite === Infinity ? 0 : Math.min((usados / limite) * 100, 100)
  const atLimit   = limite !== Infinity && usados >= limite

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BackToConfig />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('config.users.title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('config.users.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => !atLimit && setShowAdd(true)}
            title={atLimit ? t('config.users.limitReached', { limit: limite, plan: planLabel }) : t('config.users.addUser')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 10, border: 'none',
              background: atLimit ? 'var(--border)' : 'var(--color-primary)',
              color: atLimit ? 'var(--text-secondary)' : 'var(--color-primary-text)',
              fontSize: 13, fontWeight: 600,
              cursor: atLimit ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={15} />
            <span>{t('config.users.addUser')}</span>
          </button>
        </div>
      </div>

      {/* Plan usage card */}
      <div
        style={{
          padding: '16px 20px', borderRadius: 12,
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}
      >
        <Users size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('config.users.activeUsers')}</span>
            <span style={{ fontSize: 13, color: atLimit ? 'var(--color-error)' : 'var(--text-secondary)' }}>
              {usados} / {limite === Infinity ? '∞' : limite}
            </span>
          </div>
          {limite !== Infinity && (
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-hover)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: 3,
                background: pct >= 100 ? 'var(--color-error)' : pct >= 80 ? 'var(--color-warning)' : 'var(--color-primary)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
          background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {t('config.users.planLabel', { plan: planLabel })}
        </span>
      </div>

      {/* Tree view */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{t('config.users.loading')}</div>
      ) : (
        <OrgTree
          usuarios={usuarios}
          onEdit={setEditTarget}
          onBaja={handleBaja}
          onReorder={handleReorder}
        />
      )}

      {/* Roles legend */}
      <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('config.users.rolePermissions')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {ROLE_VALUES.map((rv) => (
            <div key={rv} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: ROLE_COLORS[rv], flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {t(`config.users.roleDescriptions.${rv}.label`, { defaultValue: rv })}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                  {t(`config.users.roleDescriptions.${rv}.desc`, { defaultValue: '' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddUserModal onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} />
      )}
      {editTarget && (
        <EditUserModal
          usuario={editTarget}
          todos={usuarios}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
