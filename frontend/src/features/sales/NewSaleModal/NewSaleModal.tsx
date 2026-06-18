import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useCrearVenta } from '@/hooks/useSales'
import { useAuthStore }  from '@/store/authStore'
import { offlineQueue }  from '@/services/offlineQueue'
import { api }           from '@/api/axios-config'
import { useQuery }      from '@tanstack/react-query'
import { formatMXN }     from '@/utils/formatters'
import { X, Trash2, Search, ChevronDown, ScanBarcode } from 'lucide-react'
import { BarcodeScannerModal } from '@/components/common/BarcodeScanner'
import { QuickAddProductModal } from '@/components/common/BarcodeScanner/QuickAddProductModal'
import { useBarcodeScanner } from '@/hooks/useInventory'
import { useScannerGun } from '@/hooks/useScannerGun'
import { inventoryApi } from '@/api/inventory-api'
import type { BarcodeLookupResult, Variante } from '@/types/inventory.types'
import type { DetalleVentaInput, MetodoPago, Venta } from '@/types/sales.types'

interface Producto {
  id: string; nombre: string; sku: string; precio_venta: number
  impuesto_tasa?: number | null; unidad_medida_abreviacion?: string
  tiene_variantes: boolean; es_por_peso: boolean
  maneja_inventario?: boolean; stock_disponible?: number | null
}

const DENOMINACIONES = [20, 50, 100, 200, 500]

const METODO_VALUES: MetodoPago[] = [
  'efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'credito', 'cheque', 'otro',
]

function formatCantidad(cantidad: number, abreviacion?: string): string {
  if (!abreviacion) return String(cantidad)
  const ab = abreviacion.toLowerCase()
  if (ab === 'kg' && cantidad < 1) return `${(cantidad * 1000).toFixed(0)} g`
  if (ab === 'l'  && cantidad < 1) return `${(cantidad * 1000).toFixed(0)} ml`
  const n = cantidad % 1 === 0 ? String(cantidad) : cantidad.toFixed(4).replace(/\.?0+$/, '')
  return `${n} ${abreviacion}`
}
interface Cliente  { id: string; nombre_completo: string; rfc?: string }

function useProductos(q: string, sucursalId?: string) {
  return useQuery({
    queryKey: ['productos-search', q, sucursalId],
    queryFn:  () => api.get('/api/v1/inventory/productos/', {
      params: { q, page_size: 10, ...(sucursalId ? { sucursal_id: sucursalId } : {}) },
    }).then((r) => Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
    enabled:  q.length >= 2,
    staleTime: 10_000,
  })
}

function useClientes(q: string) {
  return useQuery({
    queryKey: ['clientes-search', q],
    queryFn:  () => api.get('/api/v1/terceros/clientes/', { params: { q, page_size: 10 } })
      .then((r) => Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
    enabled:  q.length >= 2,
    staleTime: 10_000,
  })
}

interface Props {
  onClose:   () => void
  onSuccess: (venta: Venta) => void
}

export function NewSaleModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const sucursal = useAuthStore((s) => s.sucursalActiva)

  type DetalleLocal = DetalleVentaInput & {
    nombre:                   string
    impuesto_tasa?:           number | null
    unidad_medida_abreviacion?: string
    es_por_peso?:             boolean
    stock_disponible?:        number | null  // null = sin límite de inventario
  }

  // Clave única del item: id_variante si existe, sino id_producto
  const detalleKey = (d: DetalleLocal) => d.id_variante ?? d.id_producto

  interface VariantePicker { productoId: string; productoNombre: string; variantes: Variante[] }

  const [metodoPago,      setMetodoPago]      = useState<MetodoPago>('efectivo')
  const [notas,           setNotas]           = useState('')
  const [montoRecibido,   setMontoRecibido]   = useState('')
  const [notasExpandido,  setNotasExpandido]  = useState<Set<string>>(new Set())
  const [detalles,        setDetalles]        = useState<DetalleLocal[]>([])
  const [clienteId,       setClienteId]       = useState<string>('')
  const [clienteNombre,   setClienteNombre]   = useState('')
  const [searchCliente,   setSearchCliente]   = useState('')
  const [searchProd,      setSearchProd]      = useState('')
  const [error,           setError]           = useState('')
  const [showScanner,     setShowScanner]     = useState(false)
  const [quickAdd,        setQuickAdd]        = useState<any>(null)
  const [variantePicker,  setVariantePicker]  = useState<VariantePicker | null>(null)
  const [offlineQueued,   setOfflineQueued]   = useState(false)

  const { data: productos = [] } = useProductos(searchProd, sucursal?.id_sucursal)
  const { data: clientes  = [] } = useClientes(searchCliente)
  const { mutateAsync, isPending } = useCrearVenta()
  const { buscar: buscarBarcode }  = useBarcodeScanner()

  const subtotal = detalles.reduce((acc, d) => acc + d.precio_unitario * d.cantidad * (1 - (d.descuento ?? 0) / 100), 0)
  const impuesto = detalles.reduce((acc, d) => {
    const base = d.precio_unitario * d.cantidad * (1 - (d.descuento ?? 0) / 100)
    return acc + (d.impuesto_tasa ? base * (d.impuesto_tasa / 100) : 0)
  }, 0)
  const total = subtotal + impuesto
  const montoNum = parseFloat(montoRecibido) || 0
  const cambio   = metodoPago === 'efectivo' && montoNum > 0 ? Math.max(montoNum - total, 0) : 0
  const faltante = metodoPago === 'efectivo' && montoNum > 0 && montoNum < total ? total - montoNum : 0

  const addProducto = async (p: Producto) => {
    setSearchProd('')
    if (p.tiene_variantes) {
      const full = await inventoryApi.obtenerProducto(p.id)
      const activas = (full.variantes ?? []).filter((v) => v.activo)
      if (activas.length === 1) {
        const v = activas[0]
        selectVariante(p.id, p.nombre, v)
      } else {
        setVariantePicker({ productoId: p.id, productoNombre: p.nombre, variantes: activas })
      }
      return
    }
    const stockMax: number | null = p.maneja_inventario ? (p.stock_disponible ?? null) : null
    if (stockMax !== null && stockMax <= 0) {
      setError(t('newSale.noStockError', { name: p.nombre }))
      return
    }
    const incremento = p.es_por_peso ? 0.1 : 1
    const existe = detalles.find((d) => detalleKey(d) === p.id)
    if (existe) {
      const nueva = existe.cantidad + incremento
      if (stockMax !== null && nueva > stockMax) return
      setDetalles((prev) => prev.map((d) =>
        detalleKey(d) === p.id ? { ...d, cantidad: nueva } : d
      ))
    } else {
      setDetalles((prev) => [...prev, {
        id_producto: p.id, nombre: p.nombre,
        cantidad: incremento, precio_unitario: p.precio_venta, descuento: 0,
        impuesto_tasa: p.impuesto_tasa ?? null,
        unidad_medida_abreviacion: p.unidad_medida_abreviacion,
        es_por_peso: p.es_por_peso,
        notas: '',
        stock_disponible: stockMax,
      }])
    }
  }

  const selectVariante = (productoId: string, productoNombre: string, v: Variante) => {
    const precio = parseFloat(v.precio_venta_efectivo)
    const key = v.id
    const existe = detalles.find((d) => detalleKey(d) === key)
    if (existe) {
      setDetalles((prev) => prev.map((d) =>
        detalleKey(d) === key
          ? { ...d, cantidad: d.cantidad + (v.es_por_peso ? 0.1 : 1) }
          : d
      ))
    } else {
      setDetalles((prev) => [...prev, {
        id_producto:              productoId,
        id_variante:              v.id,
        nombre:                   `${productoNombre} — ${v.nombre}`,
        cantidad:                 v.es_por_peso ? 0.1 : 1,
        precio_unitario:          precio,
        descuento:                0,
        unidad_medida_abreviacion: v.unidad_medida_abreviatura ?? undefined,
        es_por_peso:              v.es_por_peso,
        notas:                    '',
      }])
    }
    setVariantePicker(null)
  }

  const toggleNotas = (key: string) =>
    setNotasExpandido((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const updateNotas = (key: string, valor: string) =>
    setDetalles((prev) => prev.map((d) => detalleKey(d) === key ? { ...d, notas: valor } : d))

  const removeProducto = (key: string) =>
    setDetalles((prev) => prev.filter((d) => detalleKey(d) !== key))

  const handleBarcodeFound = (result: BarcodeLookupResult) => {
    if (!result.encontrado) {
      setError(t('newSale.barcodeNotFound'))
      return
    }
    const p = result.producto
    if (!p.uuid) {
      setQuickAdd(result)
      return
    }
    if (!p.es_vendible) {
      setError(t('newSale.notSellable', { name: p.nombre }))
      return
    }
    setError('')
    const existe = detalles.find((d) => d.id_producto === String(p.id_producto))
    if (existe) {
      setDetalles((prev) => prev.map((d) =>
        d.id_producto === String(p.id_producto) ? { ...d, cantidad: d.cantidad + 1 } : d
      ))
    } else {
      setDetalles((prev) => [...prev, {
        id_producto:     String(p.id_producto!),
        nombre:          p.nombre,
        cantidad:        1,
        precio_unitario: p.precio_venta ?? 0,
        descuento:       0,
      }])
    }
  }

  // Pistola de código de barras (lector HID): funciona sin importar dónde esté
  // el foco. Se desactiva cuando hay un sub-modal abierto para no interferir.
  useScannerGun({
    enabled: !showScanner && !quickAdd && !variantePicker,
    onScan: async (codigo) => {
      const result = await buscarBarcode(codigo)
      if (result) handleBarcodeFound(result)
    },
  })

  const handleQuickAddSaved = (producto: any) => {
    setQuickAdd(null)
    setDetalles((prev) => [...prev, {
      id_producto:     producto.id ?? producto.id_producto,
      nombre:          producto.nombre,
      cantidad:        1,
      precio_unitario: parseFloat(producto.precio_venta ?? '0'),
      descuento:       0,
    }])
  }

  const updateCantidad = (key: string, cantidad: number) =>
    setDetalles((prev) => prev.map((d) => {
      if (detalleKey(d) !== key) return d
      const min = 0.001
      const max = d.stock_disponible != null ? d.stock_disponible : Infinity
      return { ...d, cantidad: Math.min(Math.max(min, parseFloat(cantidad.toFixed(4))), max) }
    }))

  const [montoEditing, setMontoEditing] = useState<Map<string, string>>(new Map())

  const onMontoChange = (key: string, raw: string) => {
    setMontoEditing((prev) => new Map(prev).set(key, raw))
  }

  const onMontoBlur = (key: string, precioUnitario: number) => {
    const raw = montoEditing.get(key)
    if (raw !== undefined) {
      const monto = parseFloat(raw)
      if (!isNaN(monto) && monto > 0 && precioUnitario > 0) {
        const nuevaCantidad = parseFloat((monto / precioUnitario).toFixed(4))
        setDetalles((prev) => prev.map((d) => {
          if (detalleKey(d) !== key) return d
          const max = d.stock_disponible != null ? d.stock_disponible : Infinity
          return { ...d, cantidad: Math.min(Math.max(0.001, nuevaCantidad), max) }
        }))
      }
      setMontoEditing((prev) => { const m = new Map(prev); m.delete(key); return m })
    }
  }

  const handleSubmit = async () => {
    if (detalles.length === 0) { setError(t('newSale.addProductFirst')); return }
    if (!sucursal) { setError(t('newSale.noActiveSucursal')); return }
    setError('')

    const payload = {
      id_sucursal:    sucursal.id_sucursal,
      metodo_pago:    metodoPago,
      monto_recibido: metodoPago === 'efectivo' && montoNum > 0 ? montoNum : undefined,
      items:          detalles.map(({ nombre: _n, impuesto_tasa: _t, unidad_medida_abreviacion: _u, es_por_peso: _e, ...d }) => d),
      id_cliente:     clienteId || undefined,
      notas:          notas || undefined,
    }

    if (!navigator.onLine) {
      try {
        await offlineQueue.enqueue(payload)
        setOfflineQueued(true)
        setTimeout(() => onClose(), 2500)
      } catch {
        setError(t('newSale.offlineSaveError'))
      }
      return
    }

    try {
      const venta = await mutateAsync(payload)
      onSuccess(venta)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? JSON.stringify(e?.response?.data) ?? t('newSale.createError'))
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(680px, 95vw)',
        height: 'min(90vh, 680px)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalEnter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('newSale.title')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {sucursal?.nombre ?? t('newSale.noSucursal')}
            </p>
          </div>
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, color: 'var(--text-secondary)',
            background: 'var(--surface-hover)', border: 'none', cursor: 'pointer', display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0,
        }}>

          {/* Cliente + Método pago */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>

            {/* Cliente */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                {t('newSale.customer')} <span style={{ fontWeight: 400, textTransform: 'none' }}>{t('newSale.optional')}</span>
              </label>
              {clienteId ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clienteNombre}</span>
                  <button onClick={() => { setClienteId(''); setClienteNombre('') }}
                    style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder={t('newSale.searchCustomer')}
                    value={searchCliente}
                    onChange={(e) => setSearchCliente(e.target.value)}
                    style={{
                      width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                      borderRadius: 8, fontSize: 13, outline: 'none',
                      background: 'var(--surface-hover)', border: '1px solid var(--border)',
                      color: 'var(--text)', boxSizing: 'border-box',
                    }}
                  />
                  {(clientes as Cliente[]).length > 0 && searchCliente.length >= 2 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                      marginTop: 4, borderRadius: 8, overflow: 'hidden',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}>
                      {(clientes as Cliente[]).map((c) => (
                        <button key={c.id}
                          style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          onClick={() => { setClienteId(c.id); setClienteNombre(c.nombre_completo); setSearchCliente('') }}
                        >
                          {c.nombre_completo}
                          {c.rfc && <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--text-secondary)' }}>{c.rfc}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Método de pago — dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                {t('newSale.paymentMethod')}
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                  style={{
                    width: '100%', padding: '8px 36px 8px 12px',
                    borderRadius: 8, fontSize: 13, outline: 'none',
                    background: 'var(--surface-hover)', border: '1px solid var(--border)',
                    color: 'var(--text)', cursor: 'pointer',
                    boxSizing: 'border-box', appearance: 'none',
                  }}
                >
                  {METODO_VALUES.map((v) => (
                    <option key={v} value={v}>{t(`newSale.methods.${v}`)}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-secondary)',
                  pointerEvents: 'none',
                }} />
              </div>
            </div>
          </div>

          {/* Monto recibido — solo efectivo */}
          {metodoPago === 'efectivo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                {t('newSale.amountReceived')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', gap: 6 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={total > 0 ? String(Math.ceil(total)) : '0.00'}
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 12px', borderRadius: 8, fontSize: 14,
                    fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                    background: 'var(--surface-hover)', border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
                {DENOMINACIONES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setMontoRecibido(String(d))}
                    style={{
                      padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: '1px solid var(--border)', cursor: 'pointer',
                      background: montoNum === d ? 'var(--color-primary)' : 'var(--surface-hover)',
                      color: montoNum === d ? 'var(--color-primary-text)' : 'var(--text)',
                    }}
                  >
                    ${d}
                  </button>
                ))}
              </div>
              {montoNum > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '8px 14px', borderRadius: 8,
                  background: cambio > 0 ? 'rgba(16,185,129,0.1)' : faltante > 0 ? 'rgba(239,68,68,0.08)' : 'var(--surface-hover)',
                  border: `1px solid ${cambio > 0 ? 'rgba(16,185,129,0.3)' : faltante > 0 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                }}>
                  {cambio > 0 && (
                    <>
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>{t('newSale.change')}</span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{formatMXN(cambio)}</span>
                    </>
                  )}
                  {faltante > 0 && (
                    <>
                      <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600, textTransform: 'uppercase' }}>{t('newSale.missing')}</span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>{formatMXN(faltante)}</span>
                    </>
                  )}
                  {cambio === 0 && faltante === 0 && montoNum > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{t('newSale.exactPayment')}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Productos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                {t('newSale.products')}
              </label>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6 }}>
                {t('newSale.scannerHint')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder={t('newSale.searchProduct')}
                value={searchProd}
                onChange={(e) => setSearchProd(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && searchProd.trim().length >= 6) {
                    e.preventDefault()
                    const result = await buscarBarcode(searchProd.trim())
                    if (result) handleBarcodeFound(result)
                    setSearchProd('')
                  }
                }}
                style={{
                  width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 8, fontSize: 13, outline: 'none',
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  color: 'var(--text)', boxSizing: 'border-box',
                }}
              />
              {(productos as Producto[]).length > 0 && searchProd.length >= 2 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                  marginTop: 4, borderRadius: 8, overflow: 'hidden',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}>
                  {(productos as Producto[]).map((p) => {
                    const sinStock = p.maneja_inventario && p.stock_disponible != null && p.stock_disponible <= 0
                    return (
                    <button key={p.id}
                      disabled={sinStock}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'none', border: 'none',
                        cursor: sinStock ? 'not-allowed' : 'pointer',
                        opacity: sinStock ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => { if (!sinStock) e.currentTarget.style.background = 'var(--surface-hover)' }}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      onClick={() => addProducto(p)}
                    >
                      <div style={{ minWidth: 0 }}>
                        <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
                        <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--text-secondary)' }}>{p.sku}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                        {p.maneja_inventario && p.stock_disponible != null && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                            background: sinStock ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)',
                            color: sinStock ? '#f87171' : '#10b981',
                          }}>
                            {sinStock ? t('newSale.noStock') : `${p.stock_disponible} ${t('newSale.available')}`}
                          </span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>{formatMXN(p.precio_venta)}</span>
                      </div>
                    </button>
                    )
                  })}
                </div>
              )}
            </div>
              <button
                onClick={() => setShowScanner(true)}
                title={t('newSale.scan')}
                style={{
                  padding: '8px 12px', borderRadius: 8, flexShrink: 0,
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  color: 'var(--color-primary)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500,
                }}
              >
                <ScanBarcode size={15} />
                <span style={{ whiteSpace: 'nowrap' }}>{t('newSale.scan')}</span>
              </button>
            </div>

            {/* Tabla de productos */}
            {detalles.length > 0 && (
              <div style={{ overflowX: 'auto', borderRadius: 8, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', minWidth: 440 }}>
                {/* Header tabla */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 12px', background: 'var(--surface-hover)',
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: 'var(--text-secondary)',
                }}>
                  <span>{t('newSale.productCol')}</span>
                  <span style={{ marginLeft: 'auto', paddingRight: 32 }}>{t('newSale.totalCol')}</span>
                </div>
                {detalles.map((d) => {
                  const key   = detalleKey(d)
                  const step  = d.es_por_peso ? 0.1 : 1
                  const total = d.precio_unitario * d.cantidad
                  return (
                  <div key={key} style={{ borderTop: '1px solid var(--border)' }}>

                    {/* ── Fila única: nombre + controles + total + eliminar ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', flexWrap: 'nowrap' }}>

                      {/* Nombre */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.nombre}
                          </span>
                          {d.stock_disponible != null && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
                              background: d.cantidad >= d.stock_disponible ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)',
                              color: d.cantidad >= d.stock_disponible ? '#f87171' : '#10b981',
                            }}>
                              {d.cantidad >= d.stock_disponible ? t('newSale.maxBadge') : `${d.stock_disponible} ${t('newSale.available')}`}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleNotas(key)}
                          style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {notasExpandido.has(key) ? '▲ nota' : `▼ ${d.notas ? d.notas : '+ nota'}`}
                        </button>
                      </div>

                      {d.es_por_peso ? (
                        /* ── Controles peso (inline) ───────────── */
                        <>
                          <input
                            type="number" min="0.001" step={step}
                            max={d.stock_disponible != null ? d.stock_disponible : undefined}
                            value={d.cantidad}
                            onChange={(e) => updateCantidad(key, parseFloat(e.target.value) || step)}
                            onFocus={(e) => e.target.select()}
                            style={{ width: 60, padding: '4px 6px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 6, outline: 'none', flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                            {d.unidad_medida_abreviacion ?? 'u'}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>⇄</span>
                          <input
                            type="number" min="0.01" step="0.01"
                            max={d.stock_disponible != null ? (d.stock_disponible * d.precio_unitario) : undefined}
                            value={montoEditing.has(key) ? montoEditing.get(key)! : total.toFixed(2)}
                            onChange={(e) => onMontoChange(key, e.target.value)}
                            onBlur={() => onMontoBlur(key, d.precio_unitario)}
                            onFocus={(e) => { onMontoChange(key, total.toFixed(2)); setTimeout(() => e.target.select(), 0) }}
                            style={{ width: 68, padding: '4px 6px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 6, outline: 'none', flexShrink: 0 }}
                          />
                        </>
                      ) : (
                        /* ── Controles unidades (inline) ───────── */
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                            <button onClick={() => updateCantidad(key, d.cantidad - step)}
                              style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <input
                              type="number" min="1" step={step} value={d.cantidad}
                              max={d.stock_disponible != null ? d.stock_disponible : undefined}
                              onChange={(e) => updateCantidad(key, parseFloat(e.target.value) || 1)}
                              onFocus={(e) => e.target.select()}
                              style={{ width: 40, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 4px', outline: 'none' }}
                            />
                            <button
                              onClick={() => updateCantidad(key, d.cantidad + step)}
                              disabled={d.stock_disponible != null && d.cantidad >= d.stock_disponible}
                              style={{
                                width: 22, height: 22, borderRadius: 6, fontWeight: 700, fontSize: 13,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: d.stock_disponible != null && d.cantidad >= d.stock_disponible ? 'var(--surface)' : 'var(--surface-hover)',
                                border: '1px solid var(--border)',
                                color: d.stock_disponible != null && d.cantidad >= d.stock_disponible ? 'var(--text-secondary)' : 'var(--text)',
                                cursor: d.stock_disponible != null && d.cantidad >= d.stock_disponible ? 'not-allowed' : 'pointer',
                                opacity: d.stock_disponible != null && d.cantidad >= d.stock_disponible ? 0.4 : 1,
                              }}>+</button>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{formatMXN(d.precio_unitario)}</span>
                        </>
                      )}

                      {/* Total */}
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>
                        {formatMXN(total)}
                      </span>

                      {/* Eliminar */}
                      <button
                        onClick={() => removeProducto(key)}
                        title={t('common.delete')}
                        style={{ padding: 3, borderRadius: 4, color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Nota de línea */}
                    {notasExpandido.has(key) && (
                      <div style={{ padding: '0 12px 8px' }}>
                        <input
                          type="text"
                          placeholder={t('newSale.lineNotePlaceholder')}
                          value={d.notas ?? ''}
                          onChange={(e) => updateNotas(key, e.target.value)}
                          maxLength={255}
                          style={{
                            width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
                            background: 'var(--surface-hover)', border: '1px solid var(--border)',
                            color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              {t('newSale.notes')} <span style={{ fontWeight: 400, textTransform: 'none' }}>{t('newSale.optional')}</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={t('newSale.notesPlaceholder')}
              rows={2}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                outline: 'none', resize: 'none',
                background: 'var(--surface-hover)', border: '1px solid var(--border)',
                color: 'var(--text)', boxSizing: 'border-box',
              }}
            />
          </div>

          {offlineQueued && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: 'rgba(16,185,129,0.1)', color: '#34D399',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>✓</span>
              {t('newSale.savedOffline')}
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: 'var(--color-error-bg)', color: '#F87171',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('newSale.subtotal')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatMXN(subtotal)}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('newSale.taxes')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatMXN(impuesto)}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{t('newSale.total')}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{formatMXN(total)}</p>
            </div>
            {metodoPago === 'efectivo' && cambio > 0 && (
              <div style={{
                padding: '4px 12px', borderRadius: 8,
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              }}>
                <p style={{ fontSize: 10, color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>{t('newSale.change')}</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{formatMXN(cambio)}</p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--surface-hover)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>
              {t('newSale.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || offlineQueued || detalles.length === 0}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: isPending || offlineQueued || detalles.length === 0 ? 'rgba(24,174,145,0.4)' : 'var(--color-primary)',
                color: 'var(--color-primary-text)', border: 'none',
                cursor: isPending || offlineQueued || detalles.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? t('newSale.saving') : offlineQueued ? t('newSale.savedOfflineBtn') : t('newSale.createSale')}
            </button>
          </div>
        </div>
      </div>
      {variantePicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 10000 }} onClick={() => setVariantePicker(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(380px, 92vw)',
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            zIndex: 10001, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('newSale.selectVariant')}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{variantePicker.productoNombre}</p>
              </div>
              <button onClick={() => setVariantePicker(null)} style={{ padding: 5, borderRadius: 6, background: 'var(--surface-hover)', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
              {variantePicker.variantes.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVariante(variantePicker.productoId, variantePicker.productoNombre, v)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                    background: 'var(--surface-hover)', border: '1px solid var(--border)',
                    cursor: 'pointer', gap: 8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{v.nombre}</p>
                    {v.unidad_medida_nombre && (
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
                        {v.es_por_peso ? '⚖ Por peso · ' : ''}{v.unidad_medida_nombre}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>
                    {formatMXN(parseFloat(v.precio_venta_efectivo))}
                    {v.unidad_medida_abreviatura && <span style={{ fontSize: 10, fontWeight: 500 }}> /{v.unidad_medida_abreviatura}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {quickAdd && (
        <QuickAddProductModal
          result={quickAdd}
          onSaved={handleQuickAddSaved}
          onClose={() => setQuickAdd(null)}
        />
      )}

      {showScanner && (
        <BarcodeScannerModal
          mode="venta"
          onFound={handleBarcodeFound}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>,
    document.body
  )
}
