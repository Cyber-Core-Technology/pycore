import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useCrearCompra } from '@/hooks/usePurchases'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/api/axios-config'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import { formatMXN } from '@/utils/formatters'
import { X, Plus, Trash2, Search } from 'lucide-react'
import type { MetodoPagoCompra, ItemCompraRequest } from '@/types/purchases.types'

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

interface ItemForm extends ItemCompraRequest {
  _key:            number
  nombre_producto: string
}

const inputStyle = {
  padding: '8px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
  width: '100%', boxSizing: 'border-box' as const,
}

const labelStyle = {
  fontSize: 11, fontWeight: 500 as const, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' as const,
}

// ─── Buscador de producto con autocompletado ─────────────────────────────────
// Antes era un <select> con el catálogo entero: además de obligar a bajar miles
// de productos, encontrar uno significaba recorrer la lista a mano. Busca en el
// servidor (mismo endpoint y mismo mínimo de 2 letras que Nueva Venta).
function useBuscarProductos(q: string) {
  return useQuery({
    queryKey: ['productos-search-compra', q],
    queryFn: async () => {
      const r = await api.get('/api/v1/inventory/productos/', {
        params: { q, page_size: 20 },
      })
      return Array.isArray(r.data) ? r.data : (r.data.results ?? [])
    },
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  })
}

function ProductoAutocomplete({
  nombreSeleccionado,
  onSelect,
  onClear,
}: {
  nombreSeleccionado: string
  onSelect: (producto: any) => void
  onClear:  () => void
}) {
  const { t } = useTranslation()
  const [texto, setTexto]     = useState('')
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number }>({ left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const q = useDebounce(texto, 300)
  const { data: resultados = [], isFetching } = useBuscarProductos(q)

  // El menú se dibuja en un portal con posición fija: dentro del formulario lo
  // recortaba el contenedor con scroll del modal. Se abre hacia arriba cuando
  // abajo no cabe, que es lo normal en las últimas líneas de la compra.
  const colocar = () => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const espacioAbajo  = window.innerHeight - r.bottom
    const espacioArriba = r.top
    const alto = Math.min(240, Math.max(espacioAbajo, espacioArriba) - 12)
    setPos(espacioAbajo < alto + 12 && espacioArriba > espacioAbajo
      ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 4 }
      : { left: r.left, width: r.width, top: r.bottom + 4 })
  }

  useEffect(() => {
    if (!abierto) return
    colocar()
    const on = () => colocar()
    window.addEventListener('scroll', on, true)
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on, true)
      window.removeEventListener('resize', on)
    }
  }, [abierto, resultados.length])

  if (nombreSeleccionado) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 8,
        background: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nombreSeleccionado}
        </span>
        <button
          type="button"
          onClick={() => { setTexto(''); onClear() }}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 2 }}
          title={t('common.clear', { defaultValue: 'Quitar' })}
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  const mostrarMenu = abierto && q.trim().length >= 2

  return (
    <div style={{ position: 'relative' }}>
      <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
      <input
        ref={inputRef}
        type="text"
        value={texto}
        autoComplete="off"
        placeholder={t('purchaseForm.searchProducto', { defaultValue: 'Buscar por nombre o SKU...' })}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        style={{ ...inputStyle, background: 'var(--surface)', paddingLeft: 28 }}
      />
      {mostrarMenu && createPortal(
        <div style={{
          position: 'fixed', zIndex: 10000,
          left: pos.left, width: pos.width,
          ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }),
          maxHeight: 240, overflowY: 'auto',
          borderRadius: 8, background: 'var(--surface)',
          border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
          {resultados.length === 0 ? (
            <p style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              {isFetching
                ? t('common.loading', { defaultValue: 'Buscando…' })
                : t('purchaseForm.noProductoResults', { defaultValue: 'Sin resultados' })}
            </p>
          ) : resultados.map((p: any) => (
            <button
              key={p.id}
              type="button"
              // onMouseDown + preventDefault: el clic se resuelve antes de que
              // el input pierda el foco. Con onClick, el blur cerraba el menú y
              // desmontaba el botón antes de que llegara el evento.
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(p)
                setTexto('')
                setAbierto(false)
              }}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ minWidth: 0, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.nombre}
                {p.sku && <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--text-secondary)' }}>{p.sku}</span>}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>
                {formatMXN(p.precio_compra)}
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

export function PurchaseForm({ onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const sucursal = useAuthStore((s) => s.sucursalActiva)
  const crear    = useCrearCompra()

  const [idProveedor,       setIdProveedor]       = useState('')
  const [fechaEntrega,      setFechaEntrega]       = useState('')
  const [fechaVencimiento,  setFechaVencimiento]   = useState('')
  // Toda compra se paga de alguna forma; efectivo es lo más común, así que es
  // lo que viene marcado. Es obligatorio: ya no existe "sin especificar".
  const [metodoPago,        setMetodoPago]         = useState<MetodoPagoCompra>('efectivo')
  const [numeroFactura,     setNumeroFactura]      = useState('')
  const [ordenCompra,       setOrdenCompra]        = useState('')
  const [notas,             setNotas]              = useState('')
  const [items,             setItems]              = useState<ItemForm[]>([])
  const [error,             setError]              = useState('')
  const [keyCounter,        setKeyCounter]         = useState(0)

  const { data: proveedoresData } = useQuery({
    queryKey: ['proveedores-select'],
    queryFn:  async () => {
      const r = await api.get('/api/v1/terceros/proveedores/')
      return r.data.results ?? r.data ?? []
    },
  })

  const proveedores = proveedoresData ?? []

  const agregarItem = () => {
    setItems((prev) => [...prev, {
      _key:            keyCounter,
      id_producto:     '',
      nombre_producto: '',
      cantidad:        '1',
      precio_unitario: '0.00',
      descuento:       '0',
      impuesto_tasa:   '16.00',
    }])
    setKeyCounter((k) => k + 1)
  }

  const actualizarItem = (key: number, campo: keyof ItemForm, valor: string) => {
    setItems((prev) => prev.map((item) => (
      item._key === key ? { ...item, [campo]: valor } : item
    )))
  }

  // El producto llega del buscador, así que ya viene completo: no hace falta
  // buscarlo en un catálogo cargado entero en memoria.
  const seleccionarProducto = (key: number, prod: any | null) => {
    setItems((prev) => prev.map((item) => {
      if (item._key !== key) return item
      if (!prod) return { ...item, id_producto: '', nombre_producto: '' }
      // Hereda el precio de compra y la tasa de impuesto del producto en inventario
      // (ambos siguen siendo editables manualmente por línea)
      const precioCompra = prod.precio_compra != null ? String(prod.precio_compra) : item.precio_unitario
      const impuesto     = prod.impuesto_tasa != null ? String(prod.impuesto_tasa) : '0'
      return {
        ...item,
        id_producto:     prod.id,
        nombre_producto: prod.nombre ?? '',
        precio_unitario: precioCompra,
        impuesto_tasa:   impuesto,
      }
    }))
  }

  const eliminarItem = (key: number) => {
    setItems((prev) => prev.filter((i) => i._key !== key))
  }

  const handleSubmit = async () => {
    setError('')
    if (!sucursal?.id_sucursal)  return setError(t('purchaseForm.errorSucursal'))
    if (items.length === 0)      return setError(t('purchaseForm.errorProducts'))
    if (items.some((i) => !i.id_producto)) return setError(t('purchaseForm.errorProductosSelected'))

    try {
      await crear.mutateAsync({
        id_proveedor:      idProveedor || null,
        id_sucursal:       sucursal.id_sucursal,
        fecha_entrega:     fechaEntrega      || null,
        fecha_vencimiento: fechaVencimiento  || null,
        metodo_pago:       metodoPago,
        numero_factura:    numeroFactura,
        orden_compra:      ordenCompra,
        notas,
        items: items.map(({ _key, nombre_producto, ...rest }) => rest),
      })
      onSuccess()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t('purchaseForm.errorDefault'))
    }
  }

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 9998 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(620px, 95vw)', maxHeight: '90vh',
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        zIndex: 9999,
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('purchaseForm.title')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('purchaseForm.sucursalLabel', { nombre: sucursal?.nombre ?? '—' })}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, display: 'flex', color: 'var(--text-secondary)', background: 'var(--surface-hover)', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

          {/* Proveedor (opcional) */}
          <div>
            <label style={labelStyle}>{t('purchaseForm.labelProveedor')} ({t('common.optional', { defaultValue: 'opcional' })})</label>
            <select
              value={idProveedor}
              onChange={(e) => setIdProveedor(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t('purchaseForm.sinProveedor', { defaultValue: 'Sin proveedor' })}</option>
              {proveedores.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_comercial || p.razon_social}
                </option>
              ))}
            </select>
          </div>

          {/* Fechas + método */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('purchaseForm.labelFechaEntrega')}</label>
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('purchaseForm.labelFechaVencimiento')}</label>
              <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('purchaseForm.labelMetodoPago')} *</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPagoCompra)} style={inputStyle}>
                <option value="efectivo">{t('purchaseForm.metodoPago.efectivo')}</option>
                <option value="tarjeta_debito">{t('purchaseForm.metodoPago.tarjeta_debito')}</option>
                <option value="tarjeta_credito">{t('purchaseForm.metodoPago.tarjeta_credito')}</option>
                <option value="transferencia">{t('purchaseForm.metodoPago.transferencia')}</option>
                <option value="cheque">{t('purchaseForm.metodoPago.cheque')}</option>
                <option value="otro">{t('purchaseForm.metodoPago.otro')}</option>
              </select>
            </div>
          </div>

          {/* Nº Factura + Orden */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('purchaseForm.labelNumFactura')}</label>
              <input type="text" value={numeroFactura} placeholder="Ej. FAC-2026-001" onChange={(e) => setNumeroFactura(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('purchaseForm.labelOrdenCompra')}</label>
              <input type="text" value={ordenCompra} placeholder="Ej. OC-001" onChange={(e) => setOrdenCompra(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label style={labelStyle}>{t('purchaseForm.labelNotas')}</label>
            <textarea
              value={notas} rows={2}
              placeholder={t('purchaseForm.notasPlaceholder')}
              onChange={(e) => setNotas(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Sección productos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('purchaseForm.productsTitle')}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {t('purchaseForm.productsHint')}
                </p>
              </div>
              <button
                onClick={agregarItem}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <Plus size={12} /> {t('purchaseForm.addProduct')}
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{
                padding: '28px 0', textAlign: 'center',
                color: 'var(--text-secondary)', fontSize: 13,
                border: '1px dashed var(--border)', borderRadius: 8,
              }}>
                📦 {t('purchaseForm.emptyProducts')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, idx) => (
                  <div key={item._key} style={{
                    borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--surface-hover)', padding: '12px 14px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    {/* Fila 1: número + producto + eliminar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 20 }}>
                        #{idx + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>{t('purchaseForm.labelProducto')}</label>
                        <ProductoAutocomplete
                          nombreSeleccionado={item.nombre_producto}
                          onSelect={(prod) => seleccionarProducto(item._key, prod)}
                          onClear={() => seleccionarProducto(item._key, null)}
                        />
                      </div>
                      <button
                        onClick={() => eliminarItem(item._key)}
                        style={{ padding: 6, borderRadius: 6, display: 'flex', alignSelf: 'flex-end', background: 'var(--color-error-bg)', border: 'none', color: 'var(--color-error)', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Fila 2: cantidad, precio, descuento, IVA */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={labelStyle}>{t('purchaseForm.labelCantidad')}</label>
                        <input
                          type="number" min="0.0001" step="0.0001"
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(item._key, 'cantidad', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', background: 'var(--surface)' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>{t('purchaseForm.labelPrecioUnitario')}</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.precio_unitario}
                          onChange={(e) => actualizarItem(item._key, 'precio_unitario', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', background: 'var(--surface)' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>{t('purchaseForm.labelDescuento')}</label>
                        <input
                          type="number" min="0" max="100" step="0.01"
                          value={item.descuento ?? '0'}
                          onChange={(e) => actualizarItem(item._key, 'descuento', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', background: 'var(--surface)' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>{t('purchaseForm.labelIva')}</label>
                        <input
                          type="number" min="0" max="100" step="0.01"
                          value={item.impuesto_tasa ?? '16.00'}
                          onChange={(e) => actualizarItem(item._key, 'impuesto_tasa', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', background: 'var(--surface)' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-error)', padding: '8px 12px', borderRadius: 8, background: 'var(--color-error-bg)' }}>
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}
          >
            {t('purchaseForm.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={crear.isPending}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--color-primary)', color: 'var(--color-primary-text)',
              border: 'none', cursor: crear.isPending ? 'not-allowed' : 'pointer',
              opacity: crear.isPending ? 0.7 : 1,
            }}
          >
            {crear.isPending ? t('purchaseForm.creating') : t('purchaseForm.create')}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
