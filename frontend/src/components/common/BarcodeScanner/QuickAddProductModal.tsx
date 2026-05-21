import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Package, Loader2, CheckCircle2 } from 'lucide-react'
import { inventoryApi } from '@/api/inventory-api'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/api/axios-config'
import type { BarcodeLookupResult } from '@/types/inventory.types'

interface Props {
  result:      BarcodeLookupResult
  onSaved:     (producto: any) => void
  onClose:     () => void
}

export function QuickAddProductModal({ result, onSaved, onClose }: Props) {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva)
  const p = result.producto

  const [nombre,        setNombre]        = useState(p.nombre ?? '')
  const [precioVenta,   setPrecioVenta]   = useState(p.precio_venta != null ? String(p.precio_venta) : '')
  const [precioCompra,  setPrecioCompra]  = useState(p.precio_compra != null ? String(p.precio_compra) : '')
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')
  const [manejaInv,      setManejaInv]      = useState(true)
  const [stockInicial,   setStockInicial]   = useState('0')

  const handleGuardar = async () => {
    if (!nombre.trim())      { setError('El nombre es obligatorio.'); return }
    if (!precioVenta.trim()) { setError('El precio de venta es obligatorio.'); return }
    setError('')
    setSaving(true)
    try {
      const r = await api.post('/api/v1/inventory/productos/crear-con-inventario/', {
        nombre:              nombre.trim(),
        codigo_barras:       p.codigo_barras,
        precio_venta:        precioVenta,
        precio_compra:       precioCompra || undefined,
        activo:              true,
        maneja_inventario:   manejaInv,
        stock_inicial:       manejaInv ? parseFloat(stockInicial || '0') : 0,
        sucursal_id:         sucursalActiva?.id_sucursal,
        imagen_url_externa:  p.imagen_url || undefined,
      })
      const nuevo = r.data
      onSaved(nuevo)
    } catch (e: any) {
      const msg = e?.response?.data
      if (typeof msg === 'object') {
        const first = Object.values(msg)[0]
        setError(Array.isArray(first) ? first[0] : String(first))
      } else {
        setError('Error al guardar el producto.')
      }
      setSaving(false)
    }
  }

  const field = (label: string, value: string, onChange: (v: string) => void, opts?: {
    type?: string, placeholder?: string, required?: boolean
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: 'var(--text-secondary)',
      }}>
        {label}{opts?.required && <span style={{ color: '#F87171' }}> *</span>}
      </label>
      <input
        type={opts?.type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder ?? ''}
        style={{
          padding: '9px 12px', borderRadius: 8, fontSize: 13,
          background: 'var(--surface-hover)', border: '1px solid var(--border)',
          color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 10000,
      }} />

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(440px, 95%)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        zIndex: 10001,
        overflow: 'hidden',
        animation: 'modalEnter 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(24,174,145,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Package size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Agregar producto al inventario
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                Se guardará y agregará a la venta automáticamente
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, background: 'var(--surface-hover)',
            border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Preview producto externo */}
        <div style={{
          margin: '16px 20px 0',
          padding: 12, borderRadius: 10,
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.2)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8, flexShrink: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {p.imagen_url ? (
              <img src={p.imagen_url} alt={p.nombre}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <Package size={20} style={{ color: 'var(--text-secondary)' }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.nombre}</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {p.codigo_barras}
            </p>
            {p.meta?.marca && (
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                {p.meta.marca}{p.meta.cantidad ? ` · ${p.meta.cantidad}` : ''}
              </p>
            )}
          </div>
          <div style={{
            marginLeft: 'auto', fontSize: 10, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(251,191,36,0.12)', color: 'var(--color-warning)', fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            Fuente externa
          </div>
        </div>

        {/* Formulario */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {field('Nombre del producto', nombre, setNombre, { required: true, placeholder: 'Nombre del producto' })}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {field('Precio de venta', precioVenta, setPrecioVenta, { type: 'number', placeholder: '0.00', required: true })}
            {field('Precio de compra', precioCompra, setPrecioCompra, { type: 'number', placeholder: '0.00' })}
          </div>

          {/* Toggle maneja inventario */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--surface-hover)', border: '1px solid var(--border)',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Maneja inventario</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                Controla el stock disponible de este producto
              </p>
            </div>
            <div
              onClick={() => setManejaInv((v) => !v)}
              style={{
                width: 42, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
                background: manejaInv ? 'var(--color-primary)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: manejaInv ? 21 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: manejaInv ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>

          {/* Stock inicial — solo si maneja inventario */}
          {manejaInv && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-secondary)',
              }}>
                Stock inicial
              </label>
              <input
                type="number"
                min="0"
                value={stockInicial}
                onChange={(e) => setStockInicial(e.target.value)}
                placeholder="0"
                style={{
                  padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Unidades disponibles en {sucursalActiva?.nombre ?? 'esta sucursal'}
              </p>
            </div>
          )}

          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12,
              background: 'var(--color-error-bg)', color: '#F87171',
              border: '1px solid rgba(239,68,68,0.15)',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13,
            background: 'var(--surface-hover)', color: 'var(--text)',
            border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 500,
          }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: saving ? 'rgba(24,174,145,0.4)' : 'var(--color-primary)',
            color: 'var(--color-primary-text)', border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {saving
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
              : <><CheckCircle2 size={14} /> Guardar y agregar a venta</>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>,
    document.getElementById('main-content') ?? document.body
  )
}
