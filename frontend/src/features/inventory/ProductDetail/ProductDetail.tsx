import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { useProducto } from '@/hooks/useInventory'
import { inventoryApi } from '@/api/inventory-api'
import { api, mediaUrl } from '@/api/axios-config'
import { formatMXN } from '@/utils/formatters'
import { X, Pencil, Check, ImageIcon, Search, Link, Plus, Trash2, Loader2 } from 'lucide-react'
import type { TipoProducto, FichaTecnicaItem } from '@/types/inventory.types'

interface Props {
  id:      string
  onClose: () => void
}

const inputStyle = {
  padding: '7px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
  background: 'var(--surface-hover)', border: '1px solid var(--border)',
  color: 'var(--text)', width: '100%', boxSizing: 'border-box' as const,
}
const labelStyle = {
  fontSize: 11, fontWeight: 500 as const,
  color: 'var(--text-secondary)', marginBottom: 3, display: 'block' as const,
}
const sectionStyle = {
  borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px',
  display: 'flex' as const, flexDirection: 'column' as const, gap: 10,
}
const sectionTitle = {
  fontSize: 11, fontWeight: 600 as const, textTransform: 'uppercase' as const,
  letterSpacing: '0.05em', color: 'var(--text-secondary)',
}

export function ProductDetail({ id, onClose }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: producto, isLoading } = useProducto(id === 'nuevo' ? null : id)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

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
  const [activo,           setActivo]           = useState(true)
  const [descripcionLarga,   setDescripcionLarga]   = useState('')
  const [galeriaImagenes,    setGaleriaImagenes]    = useState<string[]>([])
  const [fichaTecnica,       setFichaTecnica]       = useState<FichaTecnicaItem[]>([])
  const [nuevaGaleriaUrl,    setNuevaGaleriaUrl]    = useState('')
  const [galeriaUploading,   setGaleriaUploading]   = useState(false)
  const [showGaleriaUrlInput, setShowGaleriaUrlInput] = useState(false)
  const galeriaInputRef = useRef<HTMLInputElement>(null)

  const [imageFile,     setImageFile]     = useState<File | null>(null)
  const [imagePreview,  setImagePreview]  = useState<string | null>(null)
  const [imageDragging, setImageDragging] = useState(false)
  const [deletingImg,   setDeletingImg]   = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [showImgSearch,   setShowImgSearch]   = useState(false)
  const [imgQuery,        setImgQuery]        = useState('')
  const [imgResults,      setImgResults]      = useState<{ imageUrl: string; thumbnailUrl: string; title: string; source: string }[]>([])
  const [imgSearching,    setImgSearching]    = useState(false)
  const [imgSaving,       setImgSaving]       = useState<string | null>(null)
  const [imgSearchError,  setImgSearchError]  = useState('')
  const [showUrlInput,    setShowUrlInput]    = useState(false)
  const [pastedUrl,       setPastedUrl]       = useState('')
  const [savingUrl,       setSavingUrl]       = useState(false)

  const { data: categorias = [] } = useQuery({ queryKey: ['categorias-select'], queryFn: async () => { const r = await api.get('/api/v1/catalogs/categorias/');    return r.data.results ?? r.data ?? [] }, enabled: editing })
  const { data: unidades   = [] } = useQuery({ queryKey: ['unidades-select'],   queryFn: async () => { const r = await api.get('/api/v1/catalogs/unidades-medida/');  return r.data.results ?? r.data ?? [] }, enabled: editing })
  const { data: impuestos  = [] } = useQuery({ queryKey: ['impuestos-select'],  queryFn: async () => { const r = await api.get('/api/v1/catalogs/impuestos/');       return r.data.results ?? r.data ?? [] }, enabled: editing })

  const actualizar = useMutation({
    mutationFn: (data: any) => inventoryApi.actualizarProducto(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); qc.invalidateQueries({ queryKey: ['producto', id] }) },
  })

  const enterEdit = () => {
    if (!producto) return
    setNombre(producto.nombre)
    setCodigo(producto.codigo || '')
    setSku(producto.sku || '')
    setCodigoBarras(producto.codigo_barras || '')
    setTipo(producto.tipo)
    setCategoriaId(producto.categoria || '')
    setUnidadMedidaId(producto.unidad_medida || '')
    setImpuestoId(producto.impuesto || '')
    setPrecioVenta(producto.precio_venta || '0.00')
    setPrecioCompra(producto.precio_compra || '0.00')
    setPrecioMayoreo(producto.precio_mayoreo || '0.00')
    setManejaInventario(producto.maneja_inventario)
    setStockMinimo(producto.stock_minimo || '0')
    setStockMaximo(producto.stock_maximo || '0')
    setDescripcion(producto.descripcion || '')
    setNotas(producto.notas || '')
    setActivo(producto.activo)
    setDescripcionLarga(producto.descripcion_larga || '')
    setGaleriaImagenes(producto.galeria_imagenes || [])
    setFichaTecnica(producto.ficha_tecnica || [])
    setNuevaGaleriaUrl('')
    setImageFile(null)
    setImagePreview(null)
    setError('')
    setEditing(true)
  }

  const cancelEdit = () => { setEditing(false); setError(''); setImageFile(null); setImagePreview(null) }

  const cropToSquare = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
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
    if (!allowed.includes(file.type)) { setError(t('productDetail.errors.imageFormat')); return }
    if (file.size > 5 * 1024 * 1024) { setError(t('productDetail.errors.imageSize')); return }
    const squared = await cropToSquare(file)
    setImageFile(squared)
    setImagePreview(URL.createObjectURL(squared))
    setError('')
  }

  const handleDeleteCurrentImage = async () => {
    if (!producto?.imagen_url) return
    setDeletingImg(true)
    try {
      await inventoryApi.deleteImagen(id)
      qc.invalidateQueries({ queryKey: ['producto', id] })
    } finally {
      setDeletingImg(false)
    }
  }

  const handleBuscarImagenes = async (q?: string) => {
    const query = (q ?? imgQuery).trim() || producto?.nombre || ''
    setImgSearching(true)
    setImgSearchError('')
    try {
      const results = await inventoryApi.buscarImagenes(id, query)
      setImgResults(results)
      if (results.length === 0) setImgSearchError(t('productDetail.errors.searchNoResults'))
    } catch {
      setImgSearchError(t('productDetail.errors.searchFailed'))
    } finally {
      setImgSearching(false)
    }
  }

  const handleSeleccionarImagen = async (imageUrl: string) => {
    setImgSaving(imageUrl)
    try {
      await inventoryApi.imagenDesdeUrl(id, imageUrl)
      qc.invalidateQueries({ queryKey: ['producto', id] })
      qc.invalidateQueries({ queryKey: ['productos'] })
      setShowImgSearch(false)
      setImgResults([])
    } catch {
      setImgSearchError(t('productDetail.errors.imgSelectFailed'))
    } finally {
      setImgSaving(null)
    }
  }

  const handleGuardarUrl = async () => {
    if (!pastedUrl.trim()) return
    setSavingUrl(true)
    try {
      await inventoryApi.imagenDesdeUrl(id, pastedUrl.trim())
      qc.invalidateQueries({ queryKey: ['producto', id] })
      qc.invalidateQueries({ queryKey: ['productos'] })
      setShowUrlInput(false)
      setPastedUrl('')
    } catch {
      setError(t('productDetail.errors.urlFailed'))
    } finally {
      setSavingUrl(false)
    }
  }

  const handleGaleriaUpload = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { setError(t('productDetail.errors.galleryFormat')); return }
    if (file.size > 5 * 1024 * 1024) { setError(t('productDetail.errors.gallerySize')); return }
    setGaleriaUploading(true)
    try {
      const result = await inventoryApi.uploadGaleriaImagen(id, file)
      setGaleriaImagenes(result.galeria_imagenes)
      setError('')
    } catch {
      setError(t('productDetail.errors.galleryUploadFailed'))
    } finally {
      setGaleriaUploading(false)
      if (galeriaInputRef.current) galeriaInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setError('')
    if (!nombre.trim()) return setError(t('productDetail.errors.nameRequired'))

    try {
      await actualizar.mutateAsync({
        nombre, codigo, sku,
        codigo_barras:     codigoBarras,
        tipo,
        categoria:         categoriaId  || null,
        unidad_medida:     unidadMedidaId,
        impuesto:          impuestoId   || null,
        precio_venta:      precioVenta,
        precio_compra:     precioCompra,
        precio_mayoreo:    precioMayoreo,
        maneja_inventario: manejaInventario,
        stock_minimo:      stockMinimo,
        stock_maximo:      stockMaximo,
        descripcion, notas, activo,
        descripcion_larga: descripcionLarga,
        galeria_imagenes:  galeriaImagenes,
        ficha_tecnica:     fichaTecnica,
      })
      if (imageFile) {
        await inventoryApi.uploadImagen(id, imageFile)
        qc.invalidateQueries({ queryKey: ['producto', id] })
      }
      setEditing(false)
    } catch (e: any) {
      const data = e?.response?.data
      if (typeof data === 'object') {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        setError(msgs)
      } else {
        setError(t('productDetail.errors.saveFailed'))
      }
    }
  }

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 9998 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0,
        height: '100%', width: 'min(480px, 100vw)',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 9999, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.25s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {editing ? t('productDetail.editTitle') : t('productDetail.viewTitle')}
            </p>
            {producto && !editing && (
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-primary)', marginTop: 2 }}>{producto.sku || producto.codigo}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editing && producto && (
              <button onClick={enterEdit} style={{ padding: '5px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(27,174,145,0.1)', border: '1px solid rgba(27,174,145,0.3)', cursor: 'pointer' }}>
                <Pencil size={13} /> {t('productDetail.editBtn')}
              </button>
            )}
            {editing && (
              <>
                <button onClick={cancelEdit} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', background: 'var(--surface-hover)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  {t('common.cancel')}
                </button>
                <button onClick={handleSave} disabled={actualizar.isPending} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-primary-text)', background: 'var(--color-primary)', border: 'none', cursor: actualizar.isPending ? 'not-allowed' : 'pointer', opacity: actualizar.isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Check size={13} /> {actualizar.isPending ? t('productDetail.saving') : t('common.save')}
                </button>
              </>
            )}
            <button onClick={onClose} style={{ padding: 6, borderRadius: 8, display: 'flex', color: 'var(--text-secondary)', background: 'var(--surface-hover)', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ flexShrink: 0, padding: '8px 20px', background: 'var(--color-error-bg)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ fontSize: 13, color: 'var(--color-error)', margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(4)].map((_, i) => <div key={i} style={{ height: 64, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : !producto ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('productDetail.loadError')}</p>
            </div>
          ) : editing ? (
            <>
              {/* Info general */}
              <div style={sectionStyle}>
                <p style={sectionTitle}>{t('productDetail.sections.general')}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t('productDetail.fields.name')}</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('productDetail.fields.type')}</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoProducto)} style={inputStyle}>
                      <option value="producto">{t('productDetail.types.producto')}</option>
                      <option value="servicio">{t('productDetail.types.servicio')}</option>
                      <option value="combo">{t('productDetail.types.combo')}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t('productDetail.fields.internalCode')}</label>
                    <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="PROD-001" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('productDetail.fields.sku')}</label>
                    <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-001" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('productDetail.fields.barcode')}</label>
                    <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} placeholder="EAN/UPC" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t('productDetail.fields.category')}</label>
                    <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={inputStyle}>
                      <option value="">{t('productDetail.noCategory')}</option>
                      {(categorias as any[]).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('productDetail.fields.unit')}</label>
                    <select value={unidadMedidaId} onChange={(e) => setUnidadMedidaId(e.target.value)} style={inputStyle}>
                      <option value="">{t('productDetail.selectUnit')}</option>
                      {(unidades as any[]).map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('productDetail.fields.tax')}</label>
                    <select value={impuestoId} onChange={(e) => setImpuestoId(e.target.value)} style={inputStyle}>
                      <option value="">{t('productDetail.noTax')}</option>
                      {(impuestos as any[]).map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.tasa}%)</option>)}
                    </select>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{t('productDetail.fields.active')}</span>
                </label>
              </div>

              {/* Precios */}
              <div style={sectionStyle}>
                <p style={sectionTitle}>{t('productDetail.sections.prices')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: t('productDetail.fields.salePrice'),      value: precioVenta,   setter: setPrecioVenta   },
                    { label: t('productDetail.fields.purchasePrice'),   value: precioCompra,  setter: setPrecioCompra  },
                    { label: t('productDetail.fields.wholesalePrice'),  value: precioMayoreo, setter: setPrecioMayoreo },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label style={labelStyle}>{label}</label>
                      <input type="number" min="0" step="0.01" value={value} onChange={(e) => setter(e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Inventario */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={sectionTitle}>{t('productDetail.sections.inventory')}</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('productDetail.fields.manageStock')}</span>
                    <input type="checkbox" checked={manejaInventario} onChange={(e) => setManejaInventario(e.target.checked)} />
                  </label>
                </div>
                {manejaInventario && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>{t('productDetail.fields.minStock')}</label>
                      <input type="number" min="0" step="1" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('productDetail.fields.maxStock')}</label>
                      <input type="number" min="0" step="1" value={stockMaximo} onChange={(e) => setStockMaximo(e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Imagen */}
              <div style={sectionStyle}>
                <p style={sectionTitle}>{t('productDetail.sections.image')}</p>

                {imagePreview ? (
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, padding: '4px 10px', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      {t('productDetail.removeImage')}
                    </button>
                  </div>
                ) : producto.imagen_url ? (
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={mediaUrl(producto.imagen_url)} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0, transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.45)'; (e.currentTarget as HTMLElement).style.opacity = '1' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'; (e.currentTarget as HTMLElement).style.opacity = '0' }}
                    >
                      <button type="button" onClick={() => imageInputRef.current?.click()} style={{ padding: '6px 14px', borderRadius: 6, background: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#111' }}>{t('productDetail.changeImage')}</button>
                      <button type="button" onClick={handleDeleteCurrentImage} disabled={deletingImg} style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--color-error)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'white' }}>{deletingImg ? '...' : t('productDetail.deleteImage')}</button>
                    </div>
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
                      background: imageDragging ? 'rgba(27,174,145,0.05)' : 'var(--surface-hover)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <ImageIcon size={32} style={{ color: 'var(--text-disabled)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{t('productDetail.searchOnline').split(' ')[0]}</span>{' '}
                      {t('common.or', { defaultValue: 'o' })} arrastra<br/>{t('productDetail.imageFormats')}
                    </span>
                  </div>
                )}

                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button type="button" onClick={() => { setShowImgSearch(true); setImgQuery(producto.nombre); setImgResults([]); setImgSearchError('') }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Search size={13} /> {t('productDetail.searchOnline')}
                  </button>
                  <button type="button" onClick={() => { setShowUrlInput((v) => !v); setPastedUrl('') }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Link size={13} /> {t('productDetail.pasteUrl')}
                  </button>
                </div>

                {showUrlInput && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="url"
                      value={pastedUrl}
                      onChange={(e) => setPastedUrl(e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      style={{ ...inputStyle, flex: 1 }}
                      onKeyDown={(e) => e.key === 'Enter' && handleGuardarUrl()}
                    />
                    <button type="button" onClick={handleGuardarUrl} disabled={savingUrl || !pastedUrl.trim()}
                      style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer', flexShrink: 0, opacity: savingUrl ? 0.7 : 1 }}>
                      {savingUrl ? '...' : t('productDetail.saveUrl')}
                    </button>
                  </div>
                )}
              </div>

              {/* Modal búsqueda de imágenes */}
              {showImgSearch && createPortal(
                <>
                  <div onClick={() => setShowImgSearch(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000 }} />
                  <div style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                    width: 'min(640px, 94vw)', maxHeight: '85vh',
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.35)', zIndex: 10001,
                    display: 'flex', flexDirection: 'column', animation: 'modalEnter 0.2s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('productDetail.searchImages')}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{producto.nombre}</p>
                      </div>
                      <button onClick={() => setShowImgSearch(false)} style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--surface-hover)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </div>

                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={imgQuery}
                        onChange={(e) => setImgQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBuscarImagenes()}
                        placeholder={t('productDetail.imgSearchPlaceholder')}
                        style={{ ...inputStyle, flex: 1 }}
                        autoFocus
                      />
                      <button onClick={() => handleBuscarImagenes()} disabled={imgSearching}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: 'pointer', flexShrink: 0, opacity: imgSearching ? 0.7 : 1 }}>
                        <Search size={13} /> {imgSearching ? t('productDetail.searching') : t('productDetail.searchBtn')}
                      </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                      {imgSearchError && (
                        <p style={{ fontSize: 13, color: 'var(--color-error)', textAlign: 'center', padding: '20px 0' }}>{imgSearchError}</p>
                      )}
                      {!imgSearchError && imgResults.length === 0 && !imgSearching && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 0' }}>
                          <Search size={32} style={{ color: 'var(--text-disabled)' }} />
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('productDetail.imgSearchHint')}</p>
                        </div>
                      )}
                      {imgResults.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {imgResults.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => handleSeleccionarImagen(img.imageUrl)}
                              disabled={!!imgSaving}
                              title={img.title}
                              style={{
                                position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                                border: '2px solid var(--border)', cursor: imgSaving ? 'not-allowed' : 'pointer',
                                background: 'var(--surface-hover)', padding: 0,
                                opacity: imgSaving && imgSaving !== img.imageUrl ? 0.5 : 1,
                                transition: 'all 0.15s',
                              }}
                            >
                              <img src={img.thumbnailUrl || img.imageUrl} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              {imgSaving === img.imageUrl && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ color: 'white', fontSize: 20 }}>⏳</span>
                                </div>
                              )}
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '4px 6px', fontSize: 9, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {img.source}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
                        {t('productDetail.imgSearchFooter')}
                      </p>
                    </div>
                  </div>
                </>,
                document.body
              )}

              {/* Descripción y notas */}
              <div style={sectionStyle}>
                <p style={sectionTitle}>{t('productDetail.sections.description')}</p>
                <div>
                  <label style={labelStyle}>{t('productDetail.fields.shortDesc')}</label>
                  <textarea value={descripcion} rows={2} onChange={(e) => setDescripcion(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div>
                  <label style={labelStyle}>{t('productDetail.fields.internalNotes')}</label>
                  <textarea value={notas} rows={2} onChange={(e) => setNotas(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>

              {/* Tienda en línea */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={sectionTitle}>{t('productDetail.sections.storefront')}</p>
                  {producto.slug && (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(27,174,145,0.1)', color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
                      /{producto.slug}
                    </span>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>{t('productDetail.fields.longDesc')}</label>
                  <textarea
                    value={descripcionLarga}
                    rows={5}
                    onChange={(e) => setDescripcionLarga(e.target.value)}
                    placeholder="Describe el producto en detalle: materiales, características, usos, cuidados..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                {/* Galería */}
                <div>
                  <label style={labelStyle}>{t('productDetail.fields.gallery')}</label>
                  {galeriaImagenes.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {galeriaImagenes.map((url, i) => (
                        <div key={i} style={{ position: 'relative', width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                          <button type="button" onClick={() => setGaleriaImagenes((prev) => prev.filter((_, idx) => idx !== i))}
                            style={{ position: 'absolute', top: 1, right: 1, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: 4, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                            <Trash2 size={10} color="white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button type="button" disabled={galeriaUploading} onClick={() => galeriaInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: galeriaUploading ? 'var(--surface-hover)' : 'var(--color-primary)', color: galeriaUploading ? 'var(--text-disabled)' : 'var(--color-primary-text)', border: 'none', cursor: galeriaUploading ? 'not-allowed' : 'pointer' }}>
                      {galeriaUploading
                        ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> {t('productDetail.uploading')}</>
                        : <><Plus size={13} /> {t('productDetail.addToGallery')}</>}
                    </button>
                    <button type="button" onClick={() => { setShowGaleriaUrlInput((v) => !v); setNuevaGaleriaUrl('') }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <Link size={13} /> {t('productDetail.addGalleryUrl')}
                    </button>
                  </div>
                  <input ref={galeriaInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleGaleriaUpload(e.target.files[0])} />
                  {showGaleriaUrlInput && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input
                        type="url"
                        value={nuevaGaleriaUrl}
                        onChange={(e) => setNuevaGaleriaUrl(e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        style={{ ...inputStyle, flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && nuevaGaleriaUrl.trim()) {
                            setGaleriaImagenes((prev) => [...prev, nuevaGaleriaUrl.trim()])
                            setNuevaGaleriaUrl('')
                            setShowGaleriaUrlInput(false)
                          }
                        }}
                        autoFocus
                      />
                      <button type="button" disabled={!nuevaGaleriaUrl.trim()}
                        onClick={() => {
                          if (nuevaGaleriaUrl.trim()) {
                            setGaleriaImagenes((prev) => [...prev, nuevaGaleriaUrl.trim()])
                            setNuevaGaleriaUrl('')
                            setShowGaleriaUrlInput(false)
                          }
                        }}
                        style={{ padding: '7px 11px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-text)', cursor: 'pointer', flexShrink: 0, opacity: nuevaGaleriaUrl.trim() ? 1 : 0.5 }}>
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Ficha técnica */}
                <div>
                  <label style={labelStyle}>{t('productDetail.fields.specs')}</label>
                  {fichaTecnica.length > 0 && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                      {fichaTecnica.map((item, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, padding: '6px 8px', background: i % 2 === 0 ? 'var(--surface-hover)' : 'var(--surface)', borderBottom: i < fichaTecnica.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                          <input type="text" value={item.clave} placeholder={t('productDetail.fields.specKey')} onChange={(e) => setFichaTecnica((prev) => prev.map((r, idx) => idx === i ? { ...r, clave: e.target.value } : r))} style={{ ...inputStyle, fontSize: 12, padding: '5px 8px' }} />
                          <input type="text" value={item.valor} placeholder={t('productDetail.fields.specValue')} onChange={(e) => setFichaTecnica((prev) => prev.map((r, idx) => idx === i ? { ...r, valor: e.target.value } : r))} style={{ ...inputStyle, fontSize: 12, padding: '5px 8px' }} />
                          <button type="button" onClick={() => setFichaTecnica((prev) => prev.filter((_, idx) => idx !== i))} style={{ padding: '5px 7px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--color-error)', cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => setFichaTecnica((prev) => [...prev, { clave: '', valor: '' }])}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                    <Plus size={13} />
                    {t('productDetail.addSpec')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ── MODO VISTA ── */
            <>
              {producto.imagen_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                  <img src={mediaUrl(producto.imagen_url)} alt={producto.nombre} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('productDetail.imageProductLabel')}</p>
                </div>
              )}

              {/* Info general */}
              <div style={{ ...sectionStyle }}>
                <p style={sectionTitle}>{t('productDetail.sections.general')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: t('productDetail.viewFields.name'),        value: producto.nombre },
                    { label: t('productDetail.viewFields.type'),        value: t(`productDetail.types.${producto.tipo}`, { defaultValue: producto.tipo }) },
                    { label: t('productDetail.viewFields.sku'),         value: producto.sku || '—' },
                    { label: t('productDetail.viewFields.code'),        value: producto.codigo || '—' },
                    { label: t('productDetail.viewFields.barcode'),     value: producto.codigo_barras || '—' },
                    { label: t('productDetail.viewFields.category'),    value: producto.categoria_nombre ?? '—' },
                    { label: t('productDetail.viewFields.unit'),        value: producto.unidad_medida_nombre ?? '—' },
                    { label: t('productDetail.viewFields.tax'),         value: producto.impuesto_nombre ? `${producto.impuesto_nombre} (${producto.impuesto_tasa}%)` : '—' },
                    { label: t('productDetail.viewFields.status'),      value: producto.activo ? t('productDetail.status.active') : t('productDetail.status.inactive') },
                    { label: t('productDetail.viewFields.inventoried'), value: producto.maneja_inventario ? t('productDetail.inventoried.yes') : t('productDetail.inventoried.no') },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
                    </div>
                  ))}
                </div>
                {producto.descripcion && (
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('productDetail.viewFields.description')}</p>
                    <p style={{ fontSize: 13, color: 'var(--text)' }}>{producto.descripcion}</p>
                  </div>
                )}
              </div>

              {/* Precios */}
              <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                <p style={{ ...sectionTitle, marginBottom: 10 }}>{t('productDetail.sections.prices')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: t('productDetail.viewFields.sale'),      value: formatMXN(Number(producto.precio_venta))   },
                    { label: t('productDetail.viewFields.purchase'),  value: formatMXN(Number(producto.precio_compra))  },
                    { label: t('productDetail.viewFields.wholesale'), value: formatMXN(Number(producto.precio_mayoreo)) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock */}
              {producto.maneja_inventario && (
                <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <p style={{ ...sectionTitle, marginBottom: 10 }}>{t('productDetail.sections.inventory')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: t('productDetail.viewFields.minStock'), value: Number(producto.stock_minimo).toLocaleString(undefined) },
                      { label: t('productDetail.viewFields.maxStock'), value: Number(producto.stock_maximo).toLocaleString(undefined) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tienda en línea — solo lectura */}
              {(producto.slug || producto.descripcion_larga || (producto.ficha_tecnica && producto.ficha_tecnica.length > 0)) && (
                <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={sectionTitle}>{t('productDetail.sections.storefrontSimple')}</p>
                  {producto.slug && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('productDetail.fields.productUrl')}</p>
                      <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-primary)' }}>/{producto.slug}</p>
                    </div>
                  )}
                  {producto.descripcion_larga && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('productDetail.fields.longDescView')}</p>
                      <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {producto.descripcion_larga}
                      </p>
                    </div>
                  )}
                  {producto.galeria_imagenes && producto.galeria_imagenes.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        {t('productDetail.galleryCount', { count: producto.galeria_imagenes.length })}
                      </p>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {producto.galeria_imagenes.slice(0, 5).map((url, i) => (
                          <img key={i} src={url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {producto.ficha_tecnica && producto.ficha_tecnica.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        {t('productDetail.specsCount', { count: producto.ficha_tecnica.length })}
                      </p>
                      <div style={{ fontSize: 12, color: 'var(--text)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {producto.ficha_tecnica.slice(0, 4).map((item, i) => (
                          <span key={i} style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                            {item.clave}: <strong>{item.valor}</strong>
                          </span>
                        ))}
                        {producto.ficha_tecnica.length > 4 && (
                          <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            {t('productDetail.more', { count: producto.ficha_tecnica.length - 4 })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Variantes */}
              {producto.tiene_variantes && producto.variantes.length > 0 && (
                <div style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <p style={{ ...sectionTitle, marginBottom: 10 }}>
                    {t('productDetail.variantsTitle', { count: producto.variantes.length })}
                  </p>
                  {producto.variantes.map((v) => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{v.nombre}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>SKU: {v.sku}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatMXN(Number(v.precio_venta_efectivo))}</p>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: v.activo ? 'var(--color-success-bg)' : 'rgba(156,163,175,0.15)', color: v.activo ? 'var(--color-success)' : '#9CA3AF' }}>
                          {v.activo ? t('productDetail.status.active').replace('✅ ', '') : t('productDetail.status.inactive').replace('⛔ ', '')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
