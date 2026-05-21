import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { BackToConfig } from '../components/BackToConfig'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Search, ChevronRight, Check, Wand2 } from 'lucide-react'
import { catalogsApi } from '@/api/catalogs-api'
import type { Categoria, Impuesto, UnidadMedida } from '@/api/catalogs-api'

// ─── Plantillas predefinidas ──────────────────────────────────────────────────
interface PlantillaItemCat { nombre: string; codigo: string; descripcion?: string; padre_key?: string }
interface PlantillaCat { id: string; nombre: string; desc: string; items: PlantillaItemCat[] }

const PLANTILLAS_CATEGORIAS: PlantillaCat[] = [
  {
    id: 'ropa', nombre: 'Tienda de Ropa', desc: 'Categorías para tienda de ropa y accesorios',
    items: [
      { nombre: 'Ropa',              codigo: 'ROPA',      descripcion: 'Prendas de vestir' },
      { nombre: 'Ropa de hombre',    codigo: 'ROPA-H',    padre_key: 'ROPA' },
      { nombre: 'Ropa de mujer',     codigo: 'ROPA-M',    padre_key: 'ROPA' },
      { nombre: 'Ropa infantil',     codigo: 'ROPA-INF',  padre_key: 'ROPA' },
      { nombre: 'Calzado',           codigo: 'CALZ',      descripcion: 'Zapatos, tenis y botas' },
      { nombre: 'Calzado hombre',    codigo: 'CALZ-H',    padre_key: 'CALZ' },
      { nombre: 'Calzado mujer',     codigo: 'CALZ-M',    padre_key: 'CALZ' },
      { nombre: 'Calzado infantil',  codigo: 'CALZ-INF',  padre_key: 'CALZ' },
      { nombre: 'Accesorios',        codigo: 'ACCES',     descripcion: 'Cinturones, gorras, joyería' },
      { nombre: 'Bolsas y carteras', codigo: 'BOLSAS' },
    ],
  },
  {
    id: 'abarrotes', nombre: 'Abarrotes', desc: 'Categorías para tienda de abarrotes o minisuper',
    items: [
      { nombre: 'Lácteos y huevo',    codigo: 'LACT' },
      { nombre: 'Bebidas',            codigo: 'BEB' },
      { nombre: 'Bebidas con gas',    codigo: 'BEB-GAS',   padre_key: 'BEB' },
      { nombre: 'Bebidas sin gas',    codigo: 'BEB-SG',    padre_key: 'BEB' },
      { nombre: 'Jugos y néctares',   codigo: 'BEB-JUG',   padre_key: 'BEB' },
      { nombre: 'Carnes y embutidos', codigo: 'CARN' },
      { nombre: 'Frutas y verduras',  codigo: 'FV' },
      { nombre: 'Panadería',          codigo: 'PAN' },
      { nombre: 'Abarrotes',          codigo: 'ABARR',     descripcion: 'Enlatados, granos, pastas' },
      { nombre: 'Limpieza',           codigo: 'LIMP' },
      { nombre: 'Cuidado personal',   codigo: 'CUID' },
      { nombre: 'Botanas y dulces',   codigo: 'BOT' },
    ],
  },
  {
    id: 'restaurante', nombre: 'Restaurante / Cocina', desc: 'Categorías para restaurante o servicio de alimentos',
    items: [
      { nombre: 'Alimentos',              codigo: 'ALIM' },
      { nombre: 'Entradas',               codigo: 'ENT',       padre_key: 'ALIM' },
      { nombre: 'Platos fuertes',         codigo: 'PLAT',      padre_key: 'ALIM' },
      { nombre: 'Guarniciones',           codigo: 'GUAR',      padre_key: 'ALIM' },
      { nombre: 'Postres',                codigo: 'POST',      padre_key: 'ALIM' },
      { nombre: 'Bebidas',                codigo: 'BEB' },
      { nombre: 'Bebidas calientes',      codigo: 'BEB-CAL',   padre_key: 'BEB' },
      { nombre: 'Bebidas frías',          codigo: 'BEB-FRIA',  padre_key: 'BEB' },
      { nombre: 'Bebidas alcohólicas',    codigo: 'BEB-ALC',   padre_key: 'BEB' },
    ],
  },
  {
    id: 'ferreteria', nombre: 'Ferretería / Materiales', desc: 'Categorías para ferretería o distribuidora de materiales',
    items: [
      { nombre: 'Herramientas',     codigo: 'HERR' },
      { nombre: 'Herr. eléctricas', codigo: 'HERR-EL',  padre_key: 'HERR' },
      { nombre: 'Herr. manuales',   codigo: 'HERR-MAN', padre_key: 'HERR' },
      { nombre: 'Materiales',       codigo: 'MAT' },
      { nombre: 'Pintura',          codigo: 'PINT' },
      { nombre: 'Plomería',         codigo: 'PLOM' },
      { nombre: 'Electricidad',     codigo: 'ELEC' },
      { nombre: 'Seguridad',        codigo: 'SEG' },
    ],
  },
]

interface PlantillaUni { nombre: string; codigo: string; abreviatura: string; tipo: string }
const UNIDADES_PREDEFINIDAS: PlantillaUni[] = [
  { nombre: 'Pieza',          codigo: 'PZA',   abreviatura: 'pza',  tipo: 'pieza' },
  { nombre: 'Caja',           codigo: 'CAJA',  abreviatura: 'caja', tipo: 'pieza' },
  { nombre: 'Bolsa',          codigo: 'BOLSA', abreviatura: 'bol',  tipo: 'pieza' },
  { nombre: 'Paquete',        codigo: 'PKT',   abreviatura: 'pkt',  tipo: 'pieza' },
  { nombre: 'Docena',         codigo: 'DOC',   abreviatura: 'doc',  tipo: 'pieza' },
  { nombre: 'Par',            codigo: 'PAR',   abreviatura: 'par',  tipo: 'pieza' },
  { nombre: 'Kilogramo',      codigo: 'KG',    abreviatura: 'kg',   tipo: 'peso' },
  { nombre: 'Gramo',          codigo: 'GR',    abreviatura: 'g',    tipo: 'peso' },
  { nombre: 'Tonelada',       codigo: 'TON',   abreviatura: 'ton',  tipo: 'peso' },
  { nombre: 'Litro',          codigo: 'LT',    abreviatura: 'lt',   tipo: 'volumen' },
  { nombre: 'Mililitro',      codigo: 'ML',    abreviatura: 'ml',   tipo: 'volumen' },
  { nombre: 'Metro',          codigo: 'MT',    abreviatura: 'm',    tipo: 'longitud' },
  { nombre: 'Centímetro',     codigo: 'CM',    abreviatura: 'cm',   tipo: 'longitud' },
  { nombre: 'Metro cuadrado', codigo: 'M2',    abreviatura: 'm²',   tipo: 'area' },
  { nombre: 'Hora',           codigo: 'HR',    abreviatura: 'hr',   tipo: 'tiempo' },
  { nombre: 'Servicio',       codigo: 'SERV',  abreviatura: 'serv', tipo: 'otro' },
]

interface PlantillaImp { nombre: string; codigo: string; tasa: number; tipo: string; es_retencion: boolean }
const IMPUESTOS_PREDEFINIDOS: PlantillaImp[] = [
  { nombre: 'IVA 16%',           codigo: 'IVA16',   tasa: 16,  tipo: 'IVA',  es_retencion: false },
  { nombre: 'IVA 8% (Frontera)', codigo: 'IVA8',    tasa: 8,   tipo: 'IVA',  es_retencion: false },
  { nombre: 'IVA 0%',            codigo: 'IVA0',    tasa: 0,   tipo: 'IVA',  es_retencion: false },
  { nombre: 'IEPS 8%',           codigo: 'IEPS8',   tasa: 8,   tipo: 'IEPS', es_retencion: false },
  { nombre: 'IEPS 26.5%',        codigo: 'IEPS265', tasa: 26.5,tipo: 'IEPS', es_retencion: false },
  { nombre: 'ISR Ret. 10%',      codigo: 'ISR10',   tasa: 10,  tipo: 'ISR',  es_retencion: true },
  { nombre: 'IVA Ret. 10.6667%', codigo: 'IVARET',  tasa: 10.6667, tipo: 'IVA', es_retencion: true },
]

// ─── Modal de plantilla ───────────────────────────────────────────────────────
function PlantillaCategoriasModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (items: PlantillaItemCat[]) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)
  const plantilla = PLANTILLAS_CATEGORIAS.find(p => p.id === selected)
  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog" aria-modal="true" aria-label={t('config.catalogs.templates.categoriesAriaLabel')}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 'min(540px, 95vw)', background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--border)', zIndex: 9999,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wand2 size={16} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('config.catalogs.templates.categoriesTitle')}</p>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {t('config.catalogs.templates.categoriesDesc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PLANTILLAS_CATEGORIAS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(selected === p.id ? null : p.id)}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${selected === p.id ? 'var(--color-primary)' : 'var(--border)'}`,
                  background: selected === p.id ? 'rgba(24,174,145,0.07)' : 'var(--surface-hover)',
                  transition: 'border-color 0.15s',
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{p.nombre}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{p.desc} · {t('config.catalogs.templates.itemCount', { count: p.items.length })}</p>
              </button>
            ))}
          </div>
          {plantilla && (
            <div style={{ background: 'var(--surface-hover)', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('config.catalogs.templates.preview')}</p>
              {plantilla.items.map(item => (
                <p key={item.codigo} style={{ fontSize: 12, color: 'var(--text)', margin: '2px 0', paddingLeft: item.padre_key ? 14 : 0 }}>
                  {item.padre_key ? '↳ ' : ''}{item.nombre} <span style={{ color: 'var(--text-secondary)' }}>({item.codigo})</span>
                </p>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 14, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={() => plantilla && onCreate(plantilla.items)}
            disabled={!plantilla}
            style={{ flex: 2, padding: '8px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-text)', cursor: plantilla ? 'pointer' : 'not-allowed', opacity: plantilla ? 1 : 0.4 }}
          >
            {t('config.catalogs.templates.apply')}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ─── Checkbox row helper ──────────────────────────────────────────────────────
function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
        background: checked ? 'rgba(24,174,145,0.07)' : 'var(--surface-hover)',
        border: `1px solid ${checked ? 'var(--color-primary)' : 'transparent'}`,
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `2px solid ${checked ? 'var(--color-primary)' : 'var(--border)'}`,
        background: checked ? 'var(--color-primary)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s',
      }}>
        {checked && <Check size={10} color="#0B1A14" />}
      </span>
      {children}
    </button>
  )
}

function PlantillaUnidadesModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (items: PlantillaUni[]) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(() => new Set(UNIDADES_PREDEFINIDAS.map(u => u.codigo)))
  const toggle = (codigo: string) => setSelected(s => { const n = new Set(s); n.has(codigo) ? n.delete(codigo) : n.add(codigo); return n })
  const toggleAll = () => setSelected(s => s.size === UNIDADES_PREDEFINIDAS.length ? new Set() : new Set(UNIDADES_PREDEFINIDAS.map(u => u.codigo)))

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog" aria-modal="true" aria-label={t('config.catalogs.templates.unitsAriaLabel')}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 'min(480px, 95vw)', background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--border)', zIndex: 9999,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxHeight: '85vh',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wand2 size={16} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('config.catalogs.templates.unitsTitle')}</p>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '16px 20px 4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('config.catalogs.templates.unitsDesc')}</p>
            <button type="button" onClick={toggleAll} style={{ fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
              {selected.size === UNIDADES_PREDEFINIDAS.length ? t('config.catalogs.templates.selectNoneF') : t('config.catalogs.templates.selectAllF')}
            </button>
          </div>
        </div>
        <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {UNIDADES_PREDEFINIDAS.map(u => (
            <CheckRow key={u.codigo} checked={selected.has(u.codigo)} onChange={() => toggle(u.codigo)}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--surface)', color: 'var(--color-primary)', minWidth: 40, textAlign: 'center' }}>{u.abreviatura}</span>
              <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{u.nombre}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t(`config.catalogs.units.types.${u.tipo}`, { defaultValue: u.tipo })}</span>
            </CheckRow>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 14, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onCreate(UNIDADES_PREDEFINIDAS.filter(u => selected.has(u.codigo)))}
            disabled={selected.size === 0}
            style={{ flex: 2, padding: '8px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-text)', cursor: selected.size > 0 ? 'pointer' : 'not-allowed', opacity: selected.size > 0 ? 1 : 0.4 }}
          >
            {selected.size === 0
              ? t('config.catalogs.templates.loadUnitsDefault')
              : selected.size !== 1
                ? t('config.catalogs.templates.loadUnitsPlural', { count: selected.size })
                : t('config.catalogs.templates.loadUnits', { count: selected.size })}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

function PlantillaImpuestosModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (items: PlantillaImp[]) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['IVA16']))
  const toggle = (codigo: string) => setSelected(s => { const n = new Set(s); n.has(codigo) ? n.delete(codigo) : n.add(codigo); return n })
  const toggleAll = () => setSelected(s => s.size === IMPUESTOS_PREDEFINIDOS.length ? new Set() : new Set(IMPUESTOS_PREDEFINIDOS.map(i => i.codigo)))

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog" aria-modal="true" aria-label={t('config.catalogs.templates.taxesAriaLabel')}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 'min(480px, 95vw)', background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--border)', zIndex: 9999,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxHeight: '85vh',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wand2 size={16} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('config.catalogs.templates.taxesTitle')}</p>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '16px 20px 4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('config.catalogs.templates.taxesDesc')}</p>
            <button type="button" onClick={toggleAll} style={{ fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
              {selected.size === IMPUESTOS_PREDEFINIDOS.length ? t('config.catalogs.templates.selectNoneM') : t('config.catalogs.templates.selectAllM')}
            </button>
          </div>
        </div>
        <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {IMPUESTOS_PREDEFINIDOS.map(imp => (
            <CheckRow key={imp.codigo} checked={selected.has(imp.codigo)} onChange={() => toggle(imp.codigo)}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'var(--surface)', color: 'var(--color-warning)', minWidth: 44, textAlign: 'center' }}>{t(`config.catalogs.taxes.types.${imp.tipo}`, { defaultValue: imp.tipo })}</span>
              <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{imp.nombre}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{imp.tasa}%</span>
              {imp.es_retencion && <span style={{ fontSize: 10, color: 'var(--color-error)', background: 'var(--color-error-bg)', padding: '1px 5px', borderRadius: 4 }}>RET</span>}
            </CheckRow>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 14, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onCreate(IMPUESTOS_PREDEFINIDOS.filter(i => selected.has(i.codigo)))}
            disabled={selected.size === 0}
            style={{ flex: 2, padding: '8px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-text)', cursor: selected.size > 0 ? 'pointer' : 'not-allowed', opacity: selected.size > 0 ? 1 : 0.4 }}
          >
            {selected.size === 0
              ? t('config.catalogs.templates.loadTaxesDefault')
              : selected.size !== 1
                ? t('config.catalogs.templates.loadTaxesPlural', { count: selected.size })
                : t('config.catalogs.templates.loadTaxes', { count: selected.size })}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
  outline: 'none', background: 'var(--surface-hover)',
  border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
  background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
  background: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border)', cursor: 'pointer',
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--color-primary)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: checked ? 'var(--color-primary-text)' : 'var(--text-secondary)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Drawer base ──────────────────────────────────────────────────────────────
function Drawer({ title, onClose, children, onSubmit, saving }: {
  title: string; onClose: () => void; children: React.ReactNode;
  onSubmit: () => void; saving: boolean;
}) {
  const { t } = useTranslation()
  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 9998 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%',
          width: 'min(420px, 100%)', background: 'var(--surface)',
          borderLeft: '1px solid var(--border)', zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
          animation: 'slideInRight 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</p>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 10, padding: '14px 20px',
          borderTop: '1px solid var(--border)', flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} style={{ ...btnGhost, flex: 1 }}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            style={{ ...btnPrimary, flex: 2, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? t('common.savingEllipsis') : <><Check size={14} /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, id, required, children }: { label: string; id: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--color-error)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────
type CatForm = { nombre: string; codigo: string; descripcion: string; padre: string; activo: boolean }
const catDefault: CatForm = { nombre: '', codigo: '', descripcion: '', padre: '', activo: true }

function CategoriasTab() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [drawer, setDrawer]       = useState<{ open: boolean; editing: Categoria | null }>({ open: false, editing: null })
  const [form, setForm]           = useState<CatForm>(catDefault)
  const [error, setError]         = useState<string | null>(null)
  const [plantillaOpen, setPlantillaOpen] = useState(false)
  const [loadingPlantilla, setLoadingPlantilla] = useState(false)

  const { data: cats = [], isLoading } = useQuery({ queryKey: ['categorias'], queryFn: () => catalogsApi.categorias.listar(true) })

  const save = useMutation({
    mutationFn: () => drawer.editing
      ? catalogsApi.categorias.actualizar(drawer.editing!.id, { ...form, padre: form.padre || null })
      : catalogsApi.categorias.crear({ ...form, padre: form.padre || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); qc.invalidateQueries({ queryKey: ['categorias-count'] }); closeDrawer() },
    onError: () => setError(t('config.catalogs.categories.errorSave')),
  })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => catalogsApi.categorias.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })

  const del = useMutation({
    mutationFn: (id: string) => catalogsApi.categorias.eliminar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); qc.invalidateQueries({ queryKey: ['categorias-count'] }) },
  })

  const openNew  = () => { setForm(catDefault); setError(null); setDrawer({ open: true, editing: null }) }
  const openEdit = (c: Categoria) => { setForm({ nombre: c.nombre, codigo: c.codigo, descripcion: c.descripcion ?? '', padre: c.padre ?? '', activo: c.activo }); setError(null); setDrawer({ open: true, editing: c }) }
  const closeDrawer = () => setDrawer({ open: false, editing: null })

  const set = <K extends keyof CatForm>(k: K, v: CatForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const filtered = cats.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.codigo.toLowerCase().includes(search.toLowerCase()),
  )

  const padres = cats.filter(c => !c.padre && c.activo && c.id !== drawer.editing?.id)

  const handlePlantilla = async (items: PlantillaItemCat[]) => {
    setPlantillaOpen(false)
    setLoadingPlantilla(true)
    const existingCodigos = new Set(cats.map(c => c.codigo))
    const idMap: Record<string, string> = {}
    // Pass 1: top-level categories
    for (const item of items.filter(i => !i.padre_key)) {
      if (!existingCodigos.has(item.codigo)) {
        try {
          const created = await catalogsApi.categorias.crear({ nombre: item.nombre, codigo: item.codigo, descripcion: item.descripcion, activo: true })
          idMap[item.codigo] = created.id
        } catch { /* skip duplicates */ }
      } else {
        const existing = cats.find(c => c.codigo === item.codigo)
        if (existing) idMap[item.codigo] = existing.id
      }
    }
    // Pass 2: subcategories
    for (const item of items.filter(i => i.padre_key)) {
      if (!existingCodigos.has(item.codigo)) {
        const padreId = item.padre_key ? idMap[item.padre_key] : undefined
        try {
          await catalogsApi.categorias.crear({ nombre: item.nombre, codigo: item.codigo, descripcion: item.descripcion, padre: padreId, activo: true })
        } catch { /* skip duplicates */ }
      }
    }
    qc.invalidateQueries({ queryKey: ['categorias'] })
    qc.invalidateQueries({ queryKey: ['categorias-count'] })
    setLoadingPlantilla(false)
  }

  return (
    <>
      {plantillaOpen && <PlantillaCategoriasModal onClose={() => setPlantillaOpen(false)} onCreate={handlePlantilla} />}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} aria-hidden="true" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('config.catalogs.categories.searchPlaceholder')} aria-label={t('config.catalogs.categories.searchAriaLabel')}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <button onClick={() => setPlantillaOpen(true)} style={btnGhost} aria-label={t('config.catalogs.categories.templateAriaLabel')} disabled={loadingPlantilla}>
          <Wand2 size={14} aria-hidden="true" /> {loadingPlantilla ? t('common.loading') : t('config.catalogs.categories.templateBtn')}
        </button>
        <button onClick={openNew} style={btnPrimary} aria-label={t('config.catalogs.categories.newAriaLabel')}>
          <Plus size={14} aria-hidden="true" /> {t('config.catalogs.categories.newBtn')}
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState msg={t('config.catalogs.categories.empty')} sub={t('config.catalogs.categories.emptySub')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(cat => (
            <CatRow
              key={cat.id} cat={cat}
              onEdit={() => openEdit(cat)}
              onDelete={() => del.mutate(cat.id)}
              onToggle={(v) => toggleActivo.mutate({ id: cat.id, activo: v })}
            />
          ))}
        </div>
      )}

      {drawer.open && (
        <Drawer
          title={drawer.editing ? t('config.catalogs.categories.drawerEdit') : t('config.catalogs.categories.drawerNew')}
          onClose={closeDrawer}
          onSubmit={() => { if (!form.nombre.trim()) { setError(t('config.catalogs.categories.errorName')); return } setError(null); save.mutate() }}
          saving={save.isPending}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <p style={{ fontSize: 13, color: 'var(--color-error)', margin: 0 }}>{error}</p>}
            <Field label={t('config.catalogs.categories.fieldName')} id="cat-nombre" required>
              <input id="cat-nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inputStyle} placeholder="Ej. Ropa" autoFocus />
            </Field>
            <Field label={t('config.catalogs.categories.fieldCode')} id="cat-codigo">
              <input id="cat-codigo" value={form.codigo} onChange={e => set('codigo', e.target.value)} style={inputStyle} placeholder="Ej. ROPA" />
            </Field>
            <Field label={t('config.catalogs.categories.fieldDesc')} id="cat-desc">
              <textarea id="cat-desc" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Opcional…" />
            </Field>
            <Field label={t('config.catalogs.categories.fieldParent')} id="cat-padre">
              <select id="cat-padre" value={form.padre} onChange={e => set('padre', e.target.value)} style={inputStyle}>
                <option value="">{t('config.catalogs.categories.noParent')}</option>
                {padres.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="cat-activo" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('config.catalogs.categories.fieldActive')}</label>
              <Toggle checked={form.activo} onChange={v => set('activo', v)} label={t('config.catalogs.categories.fieldActive')} />
            </div>
          </div>
        </Drawer>
      )}
    </>
  )
}

function CatRow({ cat, onEdit, onDelete, onToggle }: { cat: Categoria; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void }) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 8, background: 'var(--surface)',
      border: '1px solid var(--border)',
      paddingLeft: cat.padre ? 28 : 12,
      opacity: cat.activo ? 1 : 0.5,
    }}>
      {cat.padre && <ChevronRight size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} aria-hidden="true" />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: cat.activo ? 'none' : 'line-through' }}>
          {cat.nombre}
          {cat.padre_nombre && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>{t('config.catalogs.categories.inParent', { parent: cat.padre_nombre })}</span>}
        </p>
        {cat.codigo && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{cat.codigo}</p>}
      </div>
      {cat.subcategorias_count > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
          {t('config.catalogs.categories.subCount', { count: cat.subcategorias_count })}
        </span>
      )}
      <Toggle checked={cat.activo} onChange={onToggle} label={cat.activo ? t('common.deactivate', { defaultValue: 'Desactivar' }) : t('common.activate', { defaultValue: 'Activar' })} />
      <button onClick={onEdit} aria-label={`Editar ${cat.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
        <Pencil size={14} />
      </button>
      {confirm ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onDelete} aria-label="Confirmar eliminación" style={{ background: 'var(--color-error)', border: 'none', cursor: 'pointer', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>{t('common.yes')}</button>
          <button onClick={() => setConfirm(false)} aria-label="Cancelar eliminación" style={{ background: 'var(--surface-hover)', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>{t('common.no')}</button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} aria-label={`Eliminar ${cat.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

// ─── IMPUESTOS ────────────────────────────────────────────────────────────────
const TIPOS_IMP = ['IVA', 'IEPS', 'ISR', 'otro'] as const
type ImpForm = { nombre: string; codigo: string; tasa: string; tipo: string; es_retencion: boolean; activo: boolean }
const impDefault: ImpForm = { nombre: '', codigo: '', tasa: '16', tipo: 'IVA', es_retencion: false, activo: true }

function ImpuestosTab() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch]         = useState('')
  const [drawer, setDrawer]         = useState<{ open: boolean; editing: Impuesto | null }>({ open: false, editing: null })
  const [form, setForm]             = useState<ImpForm>(impDefault)
  const [error, setError]           = useState<string | null>(null)
  const [plantillaOpen, setPlantillaOpen]   = useState(false)
  const [loadingPlantilla, setLoadingPlantilla] = useState(false)

  const { data: imps = [], isLoading } = useQuery({ queryKey: ['impuestos'], queryFn: () => catalogsApi.impuestos.listar(true) })

  const save = useMutation({
    mutationFn: () => drawer.editing
      ? catalogsApi.impuestos.actualizar(drawer.editing!.id, form as Partial<Impuesto>)
      : catalogsApi.impuestos.crear(form as Partial<Impuesto>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['impuestos'] }); qc.invalidateQueries({ queryKey: ['impuestos-count'] }); closeDrawer() },
    onError: () => setError(t('config.catalogs.taxes.errorSave')),
  })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => catalogsApi.impuestos.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['impuestos'] }),
  })

  const del = useMutation({
    mutationFn: (id: string) => catalogsApi.impuestos.eliminar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['impuestos'] }); qc.invalidateQueries({ queryKey: ['impuestos-count'] }) },
  })

  const openNew  = () => { setForm(impDefault); setError(null); setDrawer({ open: true, editing: null }) }
  const openEdit = (i: Impuesto) => { setForm({ nombre: i.nombre, codigo: i.codigo, tasa: String(i.tasa), tipo: i.tipo, es_retencion: i.es_retencion, activo: i.activo }); setError(null); setDrawer({ open: true, editing: i }) }
  const closeDrawer = () => setDrawer({ open: false, editing: null })
  const set = <K extends keyof ImpForm>(k: K, v: ImpForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const filtered = imps.filter(i =>
    i.nombre.toLowerCase().includes(search.toLowerCase()) ||
    i.codigo.toLowerCase().includes(search.toLowerCase()),
  )

  const handlePlantilla = async (items: PlantillaImp[]) => {
    setPlantillaOpen(false)
    setLoadingPlantilla(true)
    const existingCodigos = new Set(imps.map(i => i.codigo))
    for (const item of items) {
      if (!existingCodigos.has(item.codigo)) {
        try {
          await catalogsApi.impuestos.crear({ nombre: item.nombre, codigo: item.codigo, tasa: String(item.tasa) as any, tipo: item.tipo as any, es_retencion: item.es_retencion, activo: true })
        } catch { /* skip duplicates */ }
      }
    }
    qc.invalidateQueries({ queryKey: ['impuestos'] })
    qc.invalidateQueries({ queryKey: ['impuestos-count'] })
    setLoadingPlantilla(false)
  }

  return (
    <>
      {plantillaOpen && <PlantillaImpuestosModal onClose={() => setPlantillaOpen(false)} onCreate={handlePlantilla} />}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} aria-hidden="true" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('config.catalogs.taxes.searchPlaceholder')} aria-label={t('config.catalogs.taxes.searchAriaLabel')} style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <button onClick={() => setPlantillaOpen(true)} style={btnGhost} aria-label={t('config.catalogs.taxes.templateAriaLabel')} disabled={loadingPlantilla}>
          <Wand2 size={14} aria-hidden="true" /> {loadingPlantilla ? t('common.loading') : t('config.catalogs.taxes.predefinedBtn')}
        </button>
        <button onClick={openNew} style={btnPrimary} aria-label={t('config.catalogs.taxes.newAriaLabel')}>
          <Plus size={14} aria-hidden="true" /> {t('config.catalogs.taxes.newBtn')}
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState msg={t('config.catalogs.taxes.empty')} sub={t('config.catalogs.taxes.emptySub')} />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }} role="table" aria-label={t('config.catalogs.taxes.tableAriaLabel')}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t('config.catalogs.taxes.colName'), t('config.catalogs.taxes.colRate'), t('config.catalogs.taxes.colType'), t('config.catalogs.taxes.colRetention'), t('config.catalogs.taxes.colActive'), ''].map(h => (
                <th key={h} scope="col" style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(imp => (
              <ImpRow key={imp.id} imp={imp} onEdit={() => openEdit(imp)} onDelete={() => del.mutate(imp.id)} onToggle={v => toggleActivo.mutate({ id: imp.id, activo: v })} />
            ))}
          </tbody>
        </table>
      )}

      {drawer.open && (
        <Drawer
          title={drawer.editing ? t('config.catalogs.taxes.drawerEdit') : t('config.catalogs.taxes.drawerNew')}
          onClose={closeDrawer}
          onSubmit={() => { if (!form.nombre.trim()) { setError(t('config.catalogs.taxes.errorName')); return } if (isNaN(Number(form.tasa))) { setError(t('config.catalogs.taxes.errorRate')); return } setError(null); save.mutate() }}
          saving={save.isPending}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <p style={{ fontSize: 13, color: 'var(--color-error)', margin: 0 }}>{error}</p>}
            <Field label={t('config.catalogs.taxes.fieldName')} id="imp-nombre" required>
              <input id="imp-nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inputStyle} placeholder="Ej. IVA 16%" autoFocus />
            </Field>
            <Field label={t('config.catalogs.taxes.fieldCode')} id="imp-codigo">
              <input id="imp-codigo" value={form.codigo} onChange={e => set('codigo', e.target.value)} style={inputStyle} placeholder="Ej. IVA16" />
            </Field>
            <Field label={t('config.catalogs.taxes.fieldRate')} id="imp-tasa" required>
              <input id="imp-tasa" type="number" min={0} max={100} step={0.01} value={form.tasa} onChange={e => set('tasa', e.target.value)} style={inputStyle} placeholder="16" />
            </Field>
            <Field label={t('config.catalogs.taxes.fieldType')} id="imp-tipo">
              <select id="imp-tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inputStyle}>
                {TIPOS_IMP.map(v => <option key={v} value={v}>{t(`config.catalogs.taxes.types.${v}`, { defaultValue: v })}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="imp-ret" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('config.catalogs.taxes.fieldRetention')}</label>
              <Toggle checked={form.es_retencion} onChange={v => set('es_retencion', v)} label={t('config.catalogs.taxes.fieldRetention')} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="imp-activo" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('config.catalogs.taxes.fieldActive')}</label>
              <Toggle checked={form.activo} onChange={v => set('activo', v)} label={t('config.catalogs.taxes.fieldActive')} />
            </div>
          </div>
        </Drawer>
      )}
    </>
  )
}

function ImpRow({ imp, onEdit, onDelete, onToggle }: { imp: Impuesto; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void }) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState(false)
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', opacity: imp.activo ? 1 : 0.5 }}>
      <td style={{ padding: '10px 10px' }}>
        <span style={{ fontWeight: 500, color: 'var(--text)', textDecoration: imp.activo ? 'none' : 'line-through' }}>{imp.nombre}</span>
        {imp.codigo && <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>{imp.codigo}</span>}
      </td>
      <td style={{ padding: '10px 10px', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{imp.tasa}%</td>
      <td style={{ padding: '10px 10px' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
          {t(`config.catalogs.taxes.types.${imp.tipo}`, { defaultValue: imp.tipo })}
        </span>
      </td>
      <td style={{ padding: '10px 10px', fontSize: 12, color: imp.es_retencion ? '#10B981' : 'var(--text-secondary)' }}>
        {imp.es_retencion ? t('common.yes') : t('common.no')}
      </td>
      <td style={{ padding: '10px 10px' }}>
        <Toggle checked={imp.activo} onChange={onToggle} label={imp.activo ? t('common.deactivate', { defaultValue: 'Desactivar' }) : t('common.activate', { defaultValue: 'Activar' })} />
      </td>
      <td style={{ padding: '10px 10px' }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button onClick={onEdit} aria-label={`Editar ${imp.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
            <Pencil size={13} />
          </button>
          {confirm ? (
            <>
              <button onClick={onDelete} aria-label="Confirmar" style={{ background: 'var(--color-error)', border: 'none', cursor: 'pointer', color: '#fff', padding: '3px 7px', borderRadius: 6, fontSize: 11 }}>{t('common.yes')}</button>
              <button onClick={() => setConfirm(false)} aria-label="Cancelar" style={{ background: 'var(--surface-hover)', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: '3px 7px', borderRadius: 6, fontSize: 11 }}>{t('common.no')}</button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)} aria-label={`Eliminar ${imp.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── UNIDADES DE MEDIDA ───────────────────────────────────────────────────────
const TIPOS_UNI = ['pieza', 'peso', 'volumen', 'longitud', 'tiempo', 'area', 'otro'] as const
type UniForm = { nombre: string; codigo: string; abreviatura: string; tipo: string; activo: boolean }
const uniDefault: UniForm = { nombre: '', codigo: '', abreviatura: '', tipo: 'pieza', activo: true }

function UnidadesTab() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch]         = useState('')
  const [drawer, setDrawer]         = useState<{ open: boolean; editing: UnidadMedida | null }>({ open: false, editing: null })
  const [form, setForm]             = useState<UniForm>(uniDefault)
  const [error, setError]           = useState<string | null>(null)
  const [plantillaOpen, setPlantillaOpen]   = useState(false)
  const [loadingPlantilla, setLoadingPlantilla] = useState(false)

  const { data: unis = [], isLoading } = useQuery({ queryKey: ['unidades'], queryFn: () => catalogsApi.unidades.listar(true) })

  const save = useMutation({
    mutationFn: () => drawer.editing
      ? catalogsApi.unidades.actualizar(drawer.editing!.id, form as Partial<UnidadMedida>)
      : catalogsApi.unidades.crear(form as Partial<UnidadMedida>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['unidades'] }); qc.invalidateQueries({ queryKey: ['unidades-count'] }); closeDrawer() },
    onError: () => setError(t('config.catalogs.units.errorSave')),
  })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => catalogsApi.unidades.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['unidades'] }),
  })

  const del = useMutation({
    mutationFn: (id: string) => catalogsApi.unidades.eliminar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['unidades'] }); qc.invalidateQueries({ queryKey: ['unidades-count'] }) },
  })

  const openNew  = () => { setForm(uniDefault); setError(null); setDrawer({ open: true, editing: null }) }
  const openEdit = (u: UnidadMedida) => { setForm({ nombre: u.nombre, codigo: u.codigo, abreviatura: u.abreviatura, tipo: u.tipo, activo: u.activo }); setError(null); setDrawer({ open: true, editing: u }) }
  const closeDrawer = () => setDrawer({ open: false, editing: null })
  const set = <K extends keyof UniForm>(k: K, v: UniForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const filtered = unis.filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.codigo.toLowerCase().includes(search.toLowerCase()),
  )

  const handlePlantilla = async (items: PlantillaUni[]) => {
    setPlantillaOpen(false)
    setLoadingPlantilla(true)
    const existingCodigos = new Set(unis.map(u => u.codigo))
    for (const item of items) {
      if (!existingCodigos.has(item.codigo)) {
        try {
          await catalogsApi.unidades.crear({ nombre: item.nombre, codigo: item.codigo, abreviatura: item.abreviatura, tipo: item.tipo as any, activo: true })
        } catch { /* skip duplicates */ }
      }
    }
    qc.invalidateQueries({ queryKey: ['unidades'] })
    qc.invalidateQueries({ queryKey: ['unidades-count'] })
    setLoadingPlantilla(false)
  }

  return (
    <>
      {plantillaOpen && <PlantillaUnidadesModal onClose={() => setPlantillaOpen(false)} onCreate={handlePlantilla} />}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} aria-hidden="true" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('config.catalogs.units.searchPlaceholder')} aria-label={t('config.catalogs.units.searchAriaLabel')} style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <button onClick={() => setPlantillaOpen(true)} style={btnGhost} aria-label={t('config.catalogs.units.templateAriaLabel')} disabled={loadingPlantilla}>
          <Wand2 size={14} aria-hidden="true" /> {loadingPlantilla ? t('common.loading') : t('config.catalogs.units.predefinedBtn')}
        </button>
        <button onClick={openNew} style={btnPrimary} aria-label={t('config.catalogs.units.newAriaLabel')}>
          <Plus size={14} aria-hidden="true" /> {t('config.catalogs.units.newBtn')}
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState msg={t('config.catalogs.units.empty')} sub={t('config.catalogs.units.emptySub')} />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }} role="table" aria-label={t('config.catalogs.units.tableAriaLabel')}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t('config.catalogs.units.colName'), t('config.catalogs.units.colCode'), t('config.catalogs.units.colAbbrev'), t('config.catalogs.units.colType'), t('config.catalogs.units.colActive'), ''].map(h => (
                <th key={h} scope="col" style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(uni => (
              <UniRow key={uni.id} uni={uni} onEdit={() => openEdit(uni)} onDelete={() => del.mutate(uni.id)} onToggle={v => toggleActivo.mutate({ id: uni.id, activo: v })} />
            ))}
          </tbody>
        </table>
      )}

      {drawer.open && (
        <Drawer
          title={drawer.editing ? t('config.catalogs.units.drawerEdit') : t('config.catalogs.units.drawerNew')}
          onClose={closeDrawer}
          onSubmit={() => { if (!form.nombre.trim() || !form.abreviatura.trim()) { setError(t('config.catalogs.units.errorRequired')); return } setError(null); save.mutate() }}
          saving={save.isPending}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <p style={{ fontSize: 13, color: 'var(--color-error)', margin: 0 }}>{error}</p>}
            <Field label={t('config.catalogs.units.fieldName')} id="uni-nombre" required>
              <input id="uni-nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inputStyle} placeholder="Ej. Kilogramo" autoFocus />
            </Field>
            <Field label={t('config.catalogs.units.fieldCode')} id="uni-codigo">
              <input id="uni-codigo" value={form.codigo} onChange={e => set('codigo', e.target.value)} style={inputStyle} placeholder="Ej. KG" />
            </Field>
            <Field label={t('config.catalogs.units.fieldAbbrev')} id="uni-abrev" required>
              <input id="uni-abrev" value={form.abreviatura} onChange={e => set('abreviatura', e.target.value)} style={inputStyle} placeholder="Ej. kg" />
            </Field>
            <Field label={t('config.catalogs.units.fieldType')} id="uni-tipo">
              <select id="uni-tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inputStyle}>
                {TIPOS_UNI.map(v => <option key={v} value={v}>{t(`config.catalogs.units.types.${v}`, { defaultValue: v })}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('config.catalogs.units.fieldActive')}</label>
              <Toggle checked={form.activo} onChange={v => set('activo', v)} label={t('config.catalogs.units.fieldActive')} />
            </div>
          </div>
        </Drawer>
      )}
    </>
  )
}

function UniRow({ uni, onEdit, onDelete, onToggle }: { uni: UnidadMedida; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void }) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState(false)
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', opacity: uni.activo ? 1 : 0.5 }}>
      <td style={{ padding: '10px 10px', fontWeight: 500, color: 'var(--text)', textDecoration: uni.activo ? 'none' : 'line-through' }}>{uni.nombre}</td>
      <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', fontSize: 12 }}>{uni.codigo}</td>
      <td style={{ padding: '10px 10px' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--surface-hover)', color: 'var(--text)' }}>{uni.abreviatura}</span>
      </td>
      <td style={{ padding: '10px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>{t(`config.catalogs.units.types.${uni.tipo}`, { defaultValue: uni.tipo })}</td>
      <td style={{ padding: '10px 10px' }}>
        <Toggle checked={uni.activo} onChange={onToggle} label={uni.activo ? t('common.deactivate', { defaultValue: 'Desactivar' }) : t('common.activate', { defaultValue: 'Activar' })} />
      </td>
      <td style={{ padding: '10px 10px' }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button onClick={onEdit} aria-label={`Editar ${uni.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
            <Pencil size={13} />
          </button>
          {confirm ? (
            <>
              <button onClick={onDelete} aria-label="Confirmar" style={{ background: 'var(--color-error)', border: 'none', cursor: 'pointer', color: '#fff', padding: '3px 7px', borderRadius: 6, fontSize: 11 }}>{t('common.yes')}</button>
              <button onClick={() => setConfirm(false)} aria-label="Cancelar" style={{ background: 'var(--surface-hover)', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: '3px 7px', borderRadius: 6, fontSize: 11 }}>{t('common.no')}</button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)} aria-label={`Eliminar ${uni.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ msg, sub }: { msg: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 8 }}>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{msg}</p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{sub}</p>
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type TabId = 'categorias' | 'impuestos' | 'unidades'

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CatalogosPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('categorias')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const TABS = [
    { id: 'categorias' as TabId, label: t('config.catalogs.tabs.categorias') },
    { id: 'impuestos'  as TabId, label: t('config.catalogs.tabs.impuestos') },
    { id: 'unidades'   as TabId, label: t('config.catalogs.tabs.unidades') },
  ]

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const ids = TABS.map(t => t.id)
    if (e.key === 'ArrowRight') { const next = ids[(idx + 1) % ids.length]; setTab(next); tabRefs.current[next]?.focus() }
    if (e.key === 'ArrowLeft')  { const prev = ids[(idx - 1 + ids.length) % ids.length]; setTab(prev); tabRefs.current[prev]?.focus() }
  }

  return (
    <main style={{ padding: '20px 0 40px', maxWidth: 960, margin: '0 auto' }}>
      <BackToConfig />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('config.catalogs.title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          {t('config.catalogs.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t('config.catalogs.tabsAriaLabel')}
        style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}
      >
        {TABS.map((t, idx) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            ref={el => { tabRefs.current[t.id] = el }}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            onKeyDown={e => handleKeyDown(e, idx)}
            style={{
              padding: '10px 16px', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
              background: 'transparent',
              color:       tab === t.id ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div
        id={`panel-categorias`}
        role="tabpanel"
        aria-labelledby="tab-categorias"
        hidden={tab !== 'categorias'}
      >
        {tab === 'categorias' && <CategoriasTab />}
      </div>
      <div
        id={`panel-impuestos`}
        role="tabpanel"
        aria-labelledby="tab-impuestos"
        hidden={tab !== 'impuestos'}
      >
        {tab === 'impuestos' && <ImpuestosTab />}
      </div>
      <div
        id={`panel-unidades`}
        role="tabpanel"
        aria-labelledby="tab-unidades"
        hidden={tab !== 'unidades'}
      >
        {tab === 'unidades' && <UnidadesTab />}
      </div>
    </main>
  )
}
