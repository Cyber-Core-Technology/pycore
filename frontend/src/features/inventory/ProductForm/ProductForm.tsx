import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios-config'
import { inventoryApi } from '@/api/inventory-api'
import { X, ImageIcon, Upload } from 'lucide-react'
import type { TipoProducto } from '@/types/inventory.types'

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

const inputStyle = {
  padding: '8px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
  background: 'var(--surface)', border: '1px solid var(--border)',
  color: 'var(--text)', width: '100%', boxSizing: 'border-box' as const,
}
const labelStyle = {
  fontSize: 11, fontWeight: 500 as const,
  color: 'var(--text-secondary)', marginBottom: 4, display: 'block' as const,
}

export function ProductForm({ onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  // Campos del producto
  const [nombre,           setNombre]           = useState('')
  const [codigo,           setCodigo]           = useState('')
  const [sku,              setSku]              = useState('')
  const [codigoBarras,     setCodigoBarras]     = useState('')
  const [tipo,             setTipo]             = useState<TipoProducto>('producto')
  const [categoriaId,      setCategoriaId]      = useState('')
  const [unidadMedidaId,   setUnidadMedidaId]   = useState('')
  const [impuestoId,       setImpuestoId]       = useState('')
  const [precioVenta,      setPrecioVenta]      = useState('0.00')
  const [precioCompra,     setPrecioCompra]     = useState('0.00')
  const [precioMayoreo,    setPrecioMayoreo]    = useState('0.00')
  const [manejaInventario, setManejaInventario] = useState(true)
  const [stockMinimo,      setStockMinimo]      = useState('0')
  const [stockMaximo,      setStockMaximo]      = useState('0')
  const [descripcion,      setDescripcion]      = useState('')
  const [notas,            setNotas]            = useState('')
  const [claveProdServ,    setClaveProdServ]    = useState('01010101')
  const [claveUnidadSat,   setClaveUnidadSat]   = useState('H87')
  const [objetoImpuesto,   setObjetoImpuesto]   = useState('02')
  const [error,            setError]            = useState('')
  const [imageFile,        setImageFile]        = useState<File | null>(null)
  const [imagePreview,     setImagePreview]     = useState<string | null>(null)
  const [imageDragging,    setImageDragging]    = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Catálogos
  const { data: categorias   = [] } = useQuery({ queryKey: ['categorias-select'],   queryFn: async () => { const r = await api.get('/api/v1/catalogs/categorias/');    return r.data.results ?? r.data ?? [] } })
  const { data: unidades     = [] } = useQuery({ queryKey: ['unidades-select'],     queryFn: async () => { const r = await api.get('/api/v1/catalogs/unidades-medida/');       return r.data.results ?? r.data ?? [] } })
  const { data: impuestos    = [] } = useQuery({ queryKey: ['impuestos-select'],    queryFn: async () => { const r = await api.get('/api/v1/catalogs/impuestos/');      return r.data.results ?? r.data ?? [] } })

  const unidadSeleccionada = (unidades as any[]).find((u) => u.id === unidadMedidaId)
  const esPorPeso = unidadSeleccionada?.tipo === 'peso'

  const TIPO_LABEL: Record<string, string> = {
    pieza:    t('productForm.unidadTipos.pieza'),
    peso:     t('productForm.unidadTipos.peso'),
    volumen:  t('productForm.unidadTipos.volumen'),
    longitud: t('productForm.unidadTipos.longitud'),
    tiempo:   t('productForm.unidadTipos.tiempo'),
    area:     t('productForm.unidadTipos.area'),
    otro:     t('productForm.unidadTipos.otro'),
  }

  const crear = useMutation({
    mutationFn: (data: any) => inventoryApi.crearProducto(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      onSuccess()
    },
  })

  const cropToSquare = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => {
          resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.92)
      }
      img.src = url
    })

  const handleImageFile = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { setError('Imagen: formato no permitido (JPG, PNG, WEBP, GIF).'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Imagen: el archivo excede 5 MB.'); return }
    const squared = await cropToSquare(file)
    setImageFile(squared)
    setImagePreview(URL.createObjectURL(squared))
  }

  const handleSubmit = async () => {
    setError('')
    if (!nombre.trim())    return setError(t('productForm.errorNombre'))
    if (!unidadMedidaId)   return setError(t('productForm.errorUnidad'))

    try {
      const producto = await crear.mutateAsync({
        nombre,
        codigo:           codigo       || undefined,
        sku:              sku          || undefined,
        codigo_barras:    codigoBarras || undefined,
        tipo,
        categoria:        categoriaId  || null,
        unidad_medida:    unidadMedidaId,
        impuesto:         impuestoId   || null,
        precio_venta:     precioVenta,
        precio_compra:    precioCompra,
        precio_mayoreo:   precioMayoreo,
        maneja_inventario: manejaInventario,
        stock_minimo:     stockMinimo,
        stock_maximo:     stockMaximo,
        descripcion,
        notas,
        clave_prod_serv:  claveProdServ || '01010101',
        clave_unidad_sat: claveUnidadSat || 'H87',
        objeto_impuesto:  objetoImpuesto || '02',
        activo: true,
      })
      // Subir imagen si se seleccionó
      if (imageFile && producto.id) {
        await inventoryApi.uploadImagen(producto.id, imageFile)
      }
    } catch (e: any) {
      const data = e?.response?.data
      if (typeof data === 'object') {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        setError(msgs)
      } else {
        setError(t('productForm.errorGeneric'))
      }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('productForm.title')}</p>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, display: 'flex', color: 'var(--text-secondary)', background: 'var(--surface-hover)', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

          {/* Nombre + Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('productForm.labelNombre')}</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('productForm.labelTipo')}</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoProducto)} style={inputStyle}>
                <option value="producto">{t('productForm.tipos.producto')}</option>
                <option value="servicio">{t('productForm.tipos.servicio')}</option>
                <option value="combo">{t('productForm.tipos.combo')}</option>
              </select>
            </div>
          </div>

          {/* Código, SKU, Código de barras */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('productForm.labelCodigo')}</label>
              <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej. PROD-001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('productForm.labelSku')}</label>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ej. TOR-001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('productForm.labelCodigoBarras')}</label>
              <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} placeholder="EAN / UPC" style={inputStyle} />
            </div>
          </div>

          {/* Categoría, Unidad, Impuesto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('productForm.labelCategoria')}</label>
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={inputStyle}>
                <option value="">{t('productForm.sinCategoria')}</option>
                {(categorias as any[]).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('productForm.labelUnidad')}</label>
              <select value={unidadMedidaId} onChange={(e) => setUnidadMedidaId(e.target.value)} style={inputStyle}>
                <option value="">{t('productForm.seleccionarUnidad')}</option>
                {(unidades as any[]).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}{u.abreviatura ? ` (${u.abreviatura})` : ''} — {TIPO_LABEL[u.tipo] ?? u.tipo}
                  </option>
                ))}
              </select>
              {esPorPeso && (
                <div style={{
                  marginTop: 6, padding: '7px 10px', borderRadius: 7,
                  background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <span style={{ fontSize: 14 }}>⚖</span>
                  <span style={{ fontSize: 11, color: 'rgb(202,138,4)', lineHeight: 1.4 }}>
                    <strong>Venta por gramaje activa.</strong> En el punto de venta el cajero podrá
                    ingresar la cantidad exacta (kg, gramos) o el monto y el sistema calculará el peso.
                  </span>
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>{t('productForm.labelImpuesto')}</label>
              <select value={impuestoId} onChange={(e) => setImpuestoId(e.target.value)} style={inputStyle}>
                <option value="">{t('productForm.sinImpuesto')}</option>
                {(impuestos as any[]).map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.tasa}%)</option>)}
              </select>
            </div>
          </div>

          {/* Precios */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: t('productForm.labelPrecioVenta'),   value: precioVenta,   setter: setPrecioVenta   },
              { label: t('productForm.labelPrecioCompra'),  value: precioCompra,  setter: setPrecioCompra  },
              { label: t('productForm.labelPrecioMayoreo'), value: precioMayoreo, setter: setPrecioMayoreo },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label style={labelStyle}>{label}</label>
                <input type="number" min="0" step="0.01" value={value} onChange={(e) => setter(e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} />
              </div>
            ))}
          </div>

          {/* Inventario */}
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('productForm.controlInventario')}</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('productForm.manejarStock')}</span>
                <input type="checkbox" checked={manejaInventario} onChange={(e) => setManejaInventario(e.target.checked)} />
              </label>
            </div>
            {manejaInventario && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>{t('productForm.labelStockMinimo')}</label>
                  <input type="number" min="0" step="1" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} />
                </div>
                <div>
                  <label style={labelStyle}>{t('productForm.labelStockMaximo')}</label>
                  <input type="number" min="0" step="1" value={stockMaximo} onChange={(e) => setStockMaximo(e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} />
                </div>
              </div>
            )}
          </div>

          {/* Imagen */}
          <div>
            <label style={labelStyle}>{t('productForm.labelImagen')}</label>
            {imagePreview ? (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, padding: '4px 10px', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  {t('productForm.quitarImagen')}
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setImageDragging(true) }}
                onDragLeave={() => setImageDragging(false)}
                onDrop={(e) => { e.preventDefault(); setImageDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f) }}
                onClick={() => imageInputRef.current?.click()}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 10,
                  border: `2px dashed ${imageDragging ? 'var(--color-primary)' : 'var(--border)'}`,
                  background: imageDragging ? 'rgba(27,174,145,0.05)' : 'var(--surface)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <ImageIcon size={32} style={{ color: 'var(--text-disabled)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {t('productForm.clickOrDragText')}
                </span>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
          </div>

          {/* Fiscalización SAT / CFDI */}
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Datos SAT / CFDI 4.0</p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>{t('productForm.labelClaveProdServ')}</label>
                <input
                  type="text"
                  value={claveProdServ}
                  onChange={(e) => setClaveProdServ(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="01010101"
                  maxLength={8}
                  style={inputStyle}
                />
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
                  Busca en sat.gob.mx/cs_ClaveProdServ
                </p>
              </div>
              <div>
                <label style={labelStyle}>{t('productForm.labelClaveUnidadSat')}</label>
                <select value={claveUnidadSat} onChange={(e) => setClaveUnidadSat(e.target.value)} style={inputStyle}>
                  <option value="H87">H87 — Pieza</option>
                  <option value="E48">E48 — Servicio</option>
                  <option value="KGM">KGM — Kilogramo</option>
                  <option value="GRM">GRM — Gramo</option>
                  <option value="LTR">LTR — Litro</option>
                  <option value="MLT">MLT — Mililitro</option>
                  <option value="MTR">MTR — Metro</option>
                  <option value="CMT">CMT — Centímetro</option>
                  <option value="MTK">MTK — Metro cuadrado</option>
                  <option value="MTQ">MTQ — Metro cúbico</option>
                  <option value="HUR">HUR — Hora</option>
                  <option value="DAY">DAY — Día</option>
                  <option value="MON">MON — Mes</option>
                  <option value="XBX">XBX — Caja</option>
                  <option value="XPK">XPK — Paquete</option>
                  <option value="PR">PR — Par</option>
                  <option value="DZN">DZN — Docena</option>
                  <option value="C62">C62 — Unidad</option>
                  <option value="ACT">ACT — Actividad</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{t('productForm.labelObjetoImpuesto')}</label>
                <select value={objetoImpuesto} onChange={(e) => setObjetoImpuesto(e.target.value)} style={inputStyle}>
                  <option value="01">01 — No objeto</option>
                  <option value="02">02 — Sí objeto (IVA)</option>
                  <option value="03">03 — Sí objeto, sin desglose</option>
                </select>
              </div>
            </div>
          </div>

          {/* Descripción y notas */}
          <div>
            <label style={labelStyle}>{t('productForm.labelDescripcion')}</label>
            <textarea value={descripcion} rows={2} placeholder="Descripción del producto..." onChange={(e) => setDescripcion(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>{t('productForm.labelNotas')}</label>
            <textarea value={notas} rows={2} placeholder="Notas visibles solo para el equipo..." onChange={(e) => setNotas(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-error)', padding: '8px 12px', borderRadius: 8, background: 'var(--color-error-bg)' }}>⚠️ {error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>
            {t('productForm.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={crear.isPending}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: crear.isPending ? 'not-allowed' : 'pointer', opacity: crear.isPending ? 0.7 : 1 }}
          >
            {crear.isPending ? t('productForm.creating') : t('productForm.create')}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
