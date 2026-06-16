import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Save, Check, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { coreApi } from '@/api/core-api'
import type { EmpresaDetalle, Configuracion } from '@/api/core-api'
import { facturacionApi } from '@/api/facturacion-api'
import type { ConfiguracionFacturacion } from '@/types/facturacion.types'
import { BackToConfig } from '../components/BackToConfig'

// ─── CustomSelect: dropdown con portal para evitar recortes por overflow ──────
function CustomSelect({ id, value, onChange, options, placeholder = '…' }: {
  id: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [dropRect, setDropRect] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node
      // El menú vive en un portal (document.body), fuera de containerRef: hay que
      // excluirlo también, o el mousedown sobre una opción cierra el menú antes
      // de que dispare su onClick y nunca se selecciona.
      if (containerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setDropRect({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }

  const selected = options.find(o => o.value === value)

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={handleToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
          background: 'var(--surface-hover)', border: '1px solid var(--border)',
          color: 'var(--text)', boxSizing: 'border-box', textAlign: 'left',
          outline: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: 8, color: 'var(--text-secondary)' }} />
      </button>

      {open && createPortal(
        <div ref={dropdownRef} style={{
          position: 'fixed',
          top: dropRect.top,
          left: dropRect.left,
          width: dropRect.width,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
          zIndex: 9500, maxHeight: 260, overflowY: 'auto',
        }}>
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 13, textAlign: 'left',
                border: 'none', cursor: 'pointer',
                borderBottom: i < options.length - 1 ? '1px solid var(--border)' : 'none',
                background: o.value === value ? 'var(--color-primary)' : 'var(--surface)',
                color: o.value === value ? 'var(--color-primary-text)' : 'var(--text)',
                whiteSpace: 'normal', lineHeight: 1.4,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', maxWidth: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
  outline: 'none', background: 'var(--surface-hover)',
  border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box',
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{hint}</p>}
    </div>
  )
}

function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--color-primary)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: checked ? 'var(--color-primary-text)' : 'var(--text-secondary)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Section colapsable ────────────────────────────────────────────────────────
function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'var(--surface)', border: 'none', cursor: 'pointer',
          color: 'var(--text)', fontWeight: 600, fontSize: 14,
          borderRadius: open ? '10px 10px 0 0' : 10,
        }}
      >
        {title}
        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>
      {open && (
        <div style={{ padding: '16px 18px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderRadius: '0 0 10px 10px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

const REGIMEN_OPTIONS_BASE = [
  { value: '601', label: '601 — Personas Morales' },
  { value: '603', label: '603 — P. Morales sin fines lucrativos' },
  { value: '605', label: '605 — Sueldos y Salarios' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '612', label: '612 — P. Físicas Act. Empresariales' },
  { value: '621', label: '621 — Incorporación Fiscal' },
  { value: '626', label: '626 — Simplificado de Confianza' },
]

// ─── Page ──────────────────────────────────────────────────────────────────────
export function EmpresaConfigPage() {
  const { t }     = useTranslation()
  const qc        = useQueryClient()
  const usuario   = useAuthStore(s => s.usuario)
  const empresaId = usuario?.empresa?.id

  const selectPlaceholder = t('config.company.selectPlaceholder')

  const TIPO_NEGOCIO_OPTIONS = [
    { value: 'informal',            label: t('config.company.businessTypes.informal') },
    { value: 'formal_simplificado', label: t('config.company.businessTypes.formal_simplificado') },
    { value: 'formal_completo',     label: t('config.company.businessTypes.formal_completo') },
  ]

  const { data: empresa, isLoading } = useQuery({
    queryKey: ['empresa-config', empresaId],
    queryFn:  () => coreApi.empresa.obtener(empresaId!),
    enabled:  !!empresaId,
  })

  // Empresa form state
  const [empForm, setEmpForm] = useState({
    nombre: '', nombre_comercial: '', rfc: '', razon_social: '',
    regimen_fiscal: '', tipo_negocio: 'informal' as string,
    email: '', telefono: '', direccion: '',
  })

  // Config form state
  const [cfgForm, setCfgForm] = useState({
    moneda: 'MXN', decimales: 2, genera_cfdi: false,
    serie_factura: 'A', folio_actual: 1,
    maneja_inventario: true, alerta_stock_minimo: true,
    email_notificaciones: '',
  })

  const [saved, setSaved] = useState(false)

  // Populate from server
  useEffect(() => {
    if (!empresa) return
    setEmpForm({
      nombre:          empresa.nombre ?? '',
      nombre_comercial: empresa.nombre_comercial ?? '',
      rfc:             empresa.rfc ?? '',
      razon_social:    empresa.razon_social ?? '',
      regimen_fiscal:  empresa.regimen_fiscal ?? '',
      tipo_negocio:    empresa.tipo_negocio ?? 'informal',
      email:           empresa.email ?? '',
      telefono:        empresa.telefono ?? '',
      direccion:       empresa.direccion ?? '',
    })
    if (empresa.configuracion) {
      setCfgForm({
        moneda:               empresa.configuracion.moneda ?? 'MXN',
        decimales:            empresa.configuracion.decimales ?? 2,
        genera_cfdi:          empresa.configuracion.genera_cfdi ?? false,
        serie_factura:        empresa.configuracion.serie_factura ?? 'A',
        folio_actual:         empresa.configuracion.folio_actual ?? 1,
        maneja_inventario:    empresa.configuracion.maneja_inventario ?? true,
        alerta_stock_minimo:  empresa.configuracion.alerta_stock_minimo ?? true,
        email_notificaciones: empresa.configuracion.email_notificaciones ?? '',
      })
    }
  }, [empresa])

  const saveEmp = useMutation({
    mutationFn: () => coreApi.empresa.actualizar(empresaId!, empForm as Partial<EmpresaDetalle>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresa-config', empresaId] }),
  })

  const saveCfg = useMutation({
    mutationFn: () => coreApi.empresa.actualizarConfig(empresaId!, cfgForm as Partial<Configuracion>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresa-config', empresaId] }),
  })

  const handleSave = async () => {
    await Promise.all([saveEmp.mutateAsync(), saveCfg.mutateAsync()])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const setE = <K extends keyof typeof empForm>(k: K, v: typeof empForm[K]) => setEmpForm(f => ({ ...f, [k]: v }))
  const setC = <K extends keyof typeof cfgForm>(k: K, v: typeof cfgForm[K]) => setCfgForm(f => ({ ...f, [k]: v }))

  const isSaving = saveEmp.isPending || saveCfg.isPending
  const hasError = saveEmp.isError || saveCfg.isError

  // ── CSD upload state ────────────────────────────────────────────────────────
  const { data: facturacionCfg } = useQuery<ConfiguracionFacturacion>({
    queryKey: ['facturacion-config', empresaId],
    queryFn:  () => facturacionApi.configuracion(),
    enabled:  !!empresaId && cfgForm.genera_cfdi,
  })


  if (isLoading) {
    return (
      <main style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('config.company.loading')}</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '20px 0 60px', maxWidth: 780, margin: '0 auto' }}>
      <BackToConfig />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('config.company.title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{t('config.company.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label={t('config.company.saveAriaLabel')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: saved ? '#10B981' : 'var(--color-primary)',
            color: saved ? '#fff' : 'var(--color-primary-text)', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1, transition: 'background 0.3s',
            flexShrink: 0,
          }}
        >
          {saved ? <><Check size={14} aria-hidden="true" /> {t('config.company.saved')}</> : isSaving ? t('config.company.saving') : <><Save size={14} aria-hidden="true" /> {t('config.company.saveChanges')}</>}
        </button>
      </div>

      {hasError && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--color-error)', marginBottom: 16 }}>
          {t('config.company.saveError')}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Datos generales */}
        <Section title={t('config.company.sections.general')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: 14 }}>
            <Field label={t('config.company.fields.comercialName')} id="e-nombre">
              <input id="e-nombre" value={empForm.nombre} onChange={e => setE('nombre', e.target.value)} style={inputStyle} placeholder={t('config.company.placeholders.comercialName')} />
            </Field>
            <Field label={t('config.company.fields.legalName')} id="e-razon">
              <input id="e-razon" value={empForm.razon_social} onChange={e => setE('razon_social', e.target.value)} style={inputStyle} placeholder={t('config.company.placeholders.legalName')} />
            </Field>
            <Field label={t('config.company.fields.displayName')} id="e-nomcom">
              <input id="e-nomcom" value={empForm.nombre_comercial} onChange={e => setE('nombre_comercial', e.target.value)} style={inputStyle} placeholder={t('config.company.placeholders.displayName')} />
            </Field>
            <Field label={t('config.company.fields.rfc')} id="e-rfc" hint={t('config.company.hints.rfc')}>
              <input id="e-rfc" value={empForm.rfc} onChange={e => setE('rfc', e.target.value.toUpperCase())} style={inputStyle} placeholder="XAXX010101000" maxLength={13} />
            </Field>
            <Field label={t('config.company.fields.fiscalRegime')} id="e-regimen">
              <CustomSelect id="e-regimen" value={empForm.regimen_fiscal} onChange={v => setE('regimen_fiscal', v)} options={REGIMEN_OPTIONS_BASE} placeholder={selectPlaceholder} />
            </Field>
            <Field label={t('config.company.fields.businessType')} id="e-tipo">
              <CustomSelect id="e-tipo" value={empForm.tipo_negocio} onChange={v => setE('tipo_negocio', v)} options={TIPO_NEGOCIO_OPTIONS} placeholder={selectPlaceholder} />
            </Field>
          </div>
        </Section>

        {/* Contacto */}
        <Section title={t('config.company.sections.contact')} defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: 14 }}>
            <Field label={t('config.company.fields.email')} id="e-email">
              <input id="e-email" type="email" value={empForm.email} onChange={e => setE('email', e.target.value)} style={inputStyle} placeholder={t('config.company.placeholders.email')} />
            </Field>
            <Field label={t('config.company.fields.phone')} id="e-tel">
              <input id="e-tel" type="tel" value={empForm.telefono} onChange={e => setE('telefono', e.target.value)} style={inputStyle} placeholder={t('config.company.placeholders.phone')} />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label={t('config.company.fields.address')} id="e-dir">
                <input id="e-dir" value={empForm.direccion} onChange={e => setE('direccion', e.target.value)} style={inputStyle} placeholder={t('config.company.placeholders.address')} />
              </Field>
            </div>
          </div>
        </Section>

        {/* Configuración ERP */}
        <Section title={t('config.company.sections.system')} defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: 14 }}>
            <Field label={t('config.company.fields.currency')} id="c-moneda">
              <CustomSelect id="c-moneda" value={cfgForm.moneda} onChange={v => setC('moneda', v)}
                placeholder={selectPlaceholder}
                options={[
                  { value: 'MXN', label: t('config.company.currencies.MXN') },
                  { value: 'USD', label: t('config.company.currencies.USD') },
                  { value: 'EUR', label: t('config.company.currencies.EUR') },
                ]}
              />
            </Field>
            <Field label={t('config.company.fields.decimals')} id="c-dec">
              <CustomSelect id="c-dec" value={String(cfgForm.decimales)} onChange={v => setC('decimales', Number(v))}
                placeholder={selectPlaceholder}
                options={[
                  { value: '0', label: t('config.company.decimalsOptions.0') },
                  { value: '2', label: t('config.company.decimalsOptions.2') },
                  { value: '4', label: t('config.company.decimalsOptions.4') },
                ]}
              />
            </Field>
            <Field label={t('config.company.fields.notificationEmail')} id="c-email">
              <input id="c-email" type="email" value={cfgForm.email_notificaciones} onChange={e => setC('email_notificaciones', e.target.value)} style={inputStyle} placeholder={t('config.company.placeholders.notificationEmail')} />
            </Field>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            {[
              { id: 'c-inv',    key: 'maneja_inventario'   as const, label: t('config.company.toggles.inventory.label'),  hint: t('config.company.toggles.inventory.hint') },
              { id: 'c-alerta', key: 'alerta_stock_minimo' as const, label: t('config.company.toggles.stockAlert.label'), hint: t('config.company.toggles.stockAlert.hint') },
              { id: 'c-cfdi',   key: 'genera_cfdi'         as const, label: t('config.company.toggles.cfdi.label'),       hint: t('config.company.toggles.cfdi.hint') },
            ].map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{item.hint}</p>
                </div>
                <Toggle
                  id={item.id}
                  checked={cfgForm[item.key] as boolean}
                  onChange={v => setC(item.key, v)}
                  label={item.label}
                />
              </div>
            ))}
          </div>

          {cfgForm.genera_cfdi && (
            <div style={{
              marginTop: 16, padding: '12px 14px', borderRadius: 8,
              border: `1px solid ${facturacionCfg?.esta_lista ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
              background: facturacionCfg?.esta_lista ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {facturacionCfg?.esta_lista
                  ? <Check size={14} color="var(--color-success)" />
                  : <AlertTriangle size={14} color="var(--color-warning)" />
                }
                <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>
                  {facturacionCfg?.esta_lista
                    ? t('config.company.cfdiReady')
                    : t('config.company.cfdiPending')
                  }
                </p>
              </div>
              <a
                href="/configuracion/facturacion"
                style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--color-primary)',
                  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {t('config.company.cfdiConfigure')}
              </a>
            </div>
          )}
        </Section>
      </div>
    </main>
  )
}
