import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Check, RotateCcw, Trash2 } from 'lucide-react'
import { BackToConfig } from '../components/BackToConfig'
import {
  DEFAULT_ROLE_PERMISSIONS,
  getCustomRolePermissions,
  saveRolePermissions,
  resetRolePermissions,
} from '@/lib/rolePermissionsConfig'

const PERM_MODULES = [
  { key: 'ventas',      actions: ['ver', 'crear', 'cancelar', 'exportar', 'reportes'] },
  { key: 'compras',     actions: ['ver', 'crear', 'confirmar', 'cancelar', 'recibir'] },
  { key: 'inventario',  actions: ['ver', 'crear', 'editar'] },
  { key: 'clientes',    actions: ['ver', 'crear', 'editar'] },
  { key: 'proveedores', actions: ['ver', 'crear', 'editar'] },
  { key: 'finanzas',    actions: ['ver', 'crear'] },
  { key: 'rrhh',        actions: ['ver', 'crear', 'editar'] },
  { key: 'reportes',    actions: ['ver'] },
]

const ROLE_COLORS: Record<string, string> = {
  Administrador: '#10B981',
  Vendedor:      'var(--color-info)',
  Contador:      '#8B5CF6',
  Almacenista:   'var(--color-warning)',
  Consultor:     '#6B7280',
  Cajero:        '#EF4444',
}

const LOCKED_ROLES = new Set(['Administrador', 'admin'])

function buildInitialState(): Record<string, string[]> {
  const custom = getCustomRolePermissions()
  const result: Record<string, string[]> = {}
  const allRoles = new Set([
    ...Object.keys(DEFAULT_ROLE_PERMISSIONS).filter(r => r !== 'admin'),
    ...Object.keys(custom).filter(r => r !== 'admin'),
  ])
  allRoles.forEach(role => {
    result[role] = custom[role] ?? DEFAULT_ROLE_PERMISSIONS[role] ?? []
  })
  return result
}

export function RolesPermisosPage() {
  const { t } = useTranslation()
  const [permissions, setPermissions] = useState<Record<string, string[]>>(buildInitialState)
  const [newRoleName, setNewRoleName] = useState('')
  const [showNewRole, setShowNewRole] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roles = Object.keys(permissions).filter(r => r !== 'admin')

  const toggle = (role: string, perm: string) => {
    if (LOCKED_ROLES.has(role)) return
    setPermissions(prev => {
      const current = prev[role] ?? []
      const next = current.includes(perm)
        ? current.filter(p => p !== perm)
        : [...current, perm]
      return { ...prev, [role]: next }
    })
  }

  const has = (role: string, perm: string) => (permissions[role] ?? []).includes(perm)

  const addRole = () => {
    const name = newRoleName.trim()
    if (!name) return
    if (permissions[name]) {
      setError(t('rolesPermisos.roleExists', { name, defaultValue: `El rol "${name}" ya existe.` }))
      return
    }
    setPermissions(prev => ({ ...prev, [name]: [] }))
    setNewRoleName('')
    setShowNewRole(false)
    setError(null)
  }

  const removeRole = (role: string) => {
    if (LOCKED_ROLES.has(role)) return
    setPermissions(prev => {
      const next = { ...prev }
      delete next[role]
      return next
    })
  }

  const handleSave = () => {
    const toSave: Record<string, string[]> = {}
    roles.forEach(role => {
      if (LOCKED_ROLES.has(role)) return
      toSave[role] = permissions[role] ?? []
    })
    saveRolePermissions(toSave)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    if (!confirm(t('rolesPermisos.resetConfirm'))) return
    resetRolePermissions()
    setPermissions(buildInitialState())
  }

  const colColor = (role: string) => ROLE_COLORS[role] ?? '#6B7280'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BackToConfig />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {t('rolesPermisos.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('rolesPermisos.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setShowNewRole(true); setError(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--border)',
              background: 'transparent', color: 'var(--text-secondary)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            {t('rolesPermisos.newRole')}
          </button>
          <button
            onClick={handleReset}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-secondary)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            {t('rolesPermisos.reset')}
          </button>
          <button
            onClick={handleSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: saved ? '#10B981' : 'var(--color-primary)',
              color: saved ? '#fff' : 'var(--color-primary-text)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.3s',
            }}
          >
            {saved
              ? <><Check size={14} /> {t('rolesPermisos.saved')}</>
              : t('rolesPermisos.saveChanges')}
          </button>
        </div>
      </div>

      {/* Nuevo rol */}
      {showNewRole && (
        <div style={{
          padding: '14px 18px', borderRadius: 10,
          background: 'var(--surface)', border: '1px solid var(--color-primary)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <input
            autoFocus
            value={newRoleName}
            onChange={e => { setNewRoleName(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && addRole()}
            placeholder={t('rolesPermisos.newRolePlaceholder')}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 7, fontSize: 13,
              border: '1px solid var(--border)', background: 'var(--surface-hover)',
              color: 'var(--text)', outline: 'none',
            }}
          />
          <button
            onClick={addRole}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none',
              background: 'var(--color-primary)', color: 'var(--color-primary-text)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t('rolesPermisos.addRole')}
          </button>
          <button
            onClick={() => { setShowNewRole(false); setNewRoleName(''); setError(null) }}
            style={{
              padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-error-bg)', color: 'var(--color-error)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Aviso */}
      <div style={{
        padding: '10px 14px', borderRadius: 8,
        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
        fontSize: 12, color: 'var(--text-secondary)',
      }}>
        {t('rolesPermisos.lockedNote')}
      </div>

      {/* Tabla de permisos */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Header de roles */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `200px repeat(${roles.length}, 1fr)`,
          background: 'var(--surface-hover)',
          borderBottom: '2px solid var(--border)',
        }}>
          <div style={{
            padding: '12px 16px', fontSize: 11, fontWeight: 700,
            color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {t('rolesPermisos.moduleAction')}
          </div>
          {roles.map(role => (
            <div key={role} style={{
              padding: '10px 8px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: colColor(role), flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{role}</span>
              {!LOCKED_ROLES.has(role) ? (
                <button
                  onClick={() => removeRole(role)}
                  title={t('common.delete')}
                  style={{
                    padding: 3, borderRadius: 4, border: 'none',
                    background: 'transparent', color: 'var(--color-error)',
                    cursor: 'pointer', display: 'flex', opacity: 0.6,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >
                  <Trash2 size={11} />
                </button>
              ) : (
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 1 }}>
                  {t('rolesPermisos.locked')}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Filas por módulo */}
        {PERM_MODULES.map((mod, modIdx) => (
          <div key={mod.key}>
            {/* Módulo header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `200px repeat(${roles.length}, 1fr)`,
              background: modIdx % 2 === 0 ? 'var(--surface-hover)' : 'var(--surface)',
              borderTop: modIdx > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 700,
                color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center',
              }}>
                {t(`rolesPermisos.moduleLabels.${mod.key}`)}
              </div>
              {roles.map(role => (
                <div key={role} style={{ padding: '8px', textAlign: 'center' }} />
              ))}
            </div>

            {/* Acciones */}
            {mod.actions.map((action, actIdx) => {
              const perm = `${mod.key}.${action}`
              return (
                <div
                  key={perm}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `200px repeat(${roles.length}, 1fr)`,
                    borderTop: '1px solid var(--border)',
                    background: actIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                  }}
                >
                  <div style={{
                    padding: '9px 16px 9px 28px', fontSize: 13,
                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                  }}>
                    {t(`rolesPermisos.actionLabels.${action}`)}
                  </div>
                  {roles.map(role => {
                    const checked = has(role, perm)
                    const locked  = LOCKED_ROLES.has(role)
                    return (
                      <div key={role} style={{ padding: '9px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => toggle(role, perm)}
                          style={{
                            width: 20, height: 20, borderRadius: 5,
                            border: checked ? `2px solid ${colColor(role)}` : '2px solid var(--border)',
                            background: checked ? colColor(role) : 'transparent',
                            cursor: locked ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                            opacity: locked && !checked ? 0.4 : 1,
                            padding: 0,
                          }}
                        >
                          {checked && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12,
        padding: '14px 18px', borderRadius: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        {roles.map(role => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colColor(role) }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{role}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('rolesPermisos.permCount', { count: (permissions[role] ?? []).length })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
