// frontend/src/features/storefront/MiTiendaPage/MiTiendaPage.tsx
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Globe, Eye, Save, Settings, Package,
  ToggleLeft, ToggleRight, ExternalLink, Copy, Check,
  Palette, Info, Search, ShoppingBag, Upload, X, ImageIcon, Loader2,
  Plus, Trash2, ChevronDown, Link, Download, Share2,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { useStorefront } from '@/hooks/useStorefront'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory-api'
import { storefrontApi } from '@/api/storefront-api'
import type { StorefrontConfig, VisibilidadPublica } from '@/types/storefront.types'
import type { FichaTecnicaItem } from '@/types/inventory.types'

type Tab = 'general' | 'productos' | 'pedidos' | 'preview'

// ── Helpers ────────────────────────────────────────────────────────────────

const VISIB_VALUES: { value: VisibilidadPublica; color: string }[] = [
  { value: 'privado',           color: 'var(--text-disabled)' },
  { value: 'publico_sin_stock', color: 'var(--color-warning)' },
  { value: 'publico_con_stock', color: '#10B981' },
]

const ESTADOS_PEDIDO_VALUES: { value: string; color: string; bg: string }[] = [
  { value: 'pendiente',  color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.1)' },
  { value: 'apartado',   color: 'var(--color-info)', bg: 'rgba(59,130,246,0.1)' },
  { value: 'pagado',     color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  { value: 'en_proceso', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { value: 'listo',      color: '#1BAE91', bg: 'rgba(27,174,145,0.1)' },
  { value: 'entregado',  color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  { value: 'cancelado',  color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
    >
      {value
        ? <ToggleRight size={28} style={{ color: 'var(--color-primary)' }} />
        : <ToggleLeft  size={28} style={{ color: 'var(--text-disabled)' }} />}
    </button>
  )
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: -3 }}>{hint}</p>}
      {children}
    </div>
  )
}

function InputField({
  value, onChange, placeholder, maxLength, type = 'text',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
        border: '1px solid var(--border)', background: 'var(--surface-hover)',
        color: 'var(--text)', outline: 'none',
      }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
      onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
    />
  )
}

// ── Banner Uploader ─────────────────────────────────────────────────────────

function BannerUploader({
  currentUrl,
  onUploaded,
  onDeleted,
}: {
  currentUrl: string
  onUploaded: (url: string) => void
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const inputRef                    = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]   = useState(false)
  const [dragging,  setDragging]    = useState(false)
  const [error,     setError]       = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setError(t('miTienda.banner.errorFormat'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('miTienda.banner.errorSize'))
      return
    }
    setUploading(true)
    try {
      const result = await storefrontApi.uploadBanner(file)
      onUploaded(result.banner_url)
    } catch {
      setError(t('miTienda.banner.errorUpload'))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    setUploading(true)
    try {
      await storefrontApi.deleteBanner()
      onDeleted()
    } catch {
      setError(t('miTienda.banner.errorDelete'))
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (currentUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', height: 120 }}>
          <img
            src={currentUrl}
            alt="Banner"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#111827' }}
            >
              <Upload size={12} />
              {t('miTienda.banner.change')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.85)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'white' }}
            >
              <X size={12} />
              {t('miTienda.banner.delete')}
            </button>
          </div>
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 13 }}>{t('miTienda.banner.uploading')}</span>
            </div>
          )}
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</p>}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          height: 120, borderRadius: 10, border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--border)'}`,
          background: dragging ? 'rgba(27,174,145,0.05)' : 'var(--surface-hover)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, cursor: uploading ? 'wait' : 'pointer', transition: 'all 0.15s',
        }}
      >
        {uploading ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('miTienda.banner.uploadImg')}</p>
        ) : (
          <>
            <ImageIcon size={28} style={{ color: 'var(--text-disabled)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                <span style={{ color: 'var(--color-primary)' }}>{t('miTienda.banner.clickOrDrag')}</span>{t('miTienda.banner.clickOrDragText')}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2 }}>
                {t('miTienda.banner.formats')}
              </p>
            </div>
          </>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  )
}

// ── Tab: General ───────────────────────────────────────────────────────────

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'

function TabGeneral({
  config, onChange, onSave, saving, onBannerUploaded, onBannerDeleted,
}: {
  config:           StorefrontConfig
  onChange:         (partial: Partial<StorefrontConfig>) => void
  onSave:           () => void
  saving:           boolean
  onBannerUploaded: (url: string) => void
  onBannerDeleted:  () => void
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const slugTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedSlugRef  = useRef(config.slug)
  const qrCanvasRef   = useRef<HTMLDivElement>(null)
  const tiendaUrl     = `/p/${config.slug}`
  const storefrontOrigin = import.meta.env.VITE_STOREFRONT_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const fullUrl       = storefrontOrigin + tiendaUrl

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const buildQRCard = (): string | null => {
    const qrCanvas = qrCanvasRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!qrCanvas) return null

    const S    = 2
    const W    = 380
    const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    const hasWA    = !!config.whatsapp
    const hasEmail = !!config.email_pub
    const items    = [
      hasWA    && `💬 ${config.whatsapp}`,
      hasEmail && `✉ ${config.email_pub}`,
    ].filter(Boolean) as string[]
    const footerH  = items.length > 0 ? 28 + items.length * 28 + 20 : 0
    const headerH  = config.descripcion ? 148 : 110
    const bodyH    = 248
    const H        = headerH + bodyH + footerH

    const cv     = document.createElement('canvas')
    cv.width     = W * S
    cv.height    = H * S
    const ctx    = cv.getContext('2d')!
    ctx.scale(S, S)

    // Clip to rounded card
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.clip()

    // ── Header ──
    ctx.fillStyle = config.color_primario
    ctx.fillRect(0, 0, W, headerH)

    ctx.fillStyle    = 'white'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font         = `bold 23px ${font}`
    const name = config.nombre_tienda || t('miTienda.title')
    ctx.fillText(name.length > 30 ? name.slice(0, 29) + '…' : name, W / 2, config.descripcion ? 68 : 56)

    if (config.descripcion) {
      ctx.fillStyle = 'rgba(255,255,255,0.76)'
      ctx.font      = `12px ${font}`
      const desc    = config.descripcion
      ctx.fillText(desc.length > 58 ? desc.slice(0, 57) + '…' : desc, W / 2, 106)
    }

    // ── Body (white) ──
    ctx.fillStyle = 'white'
    ctx.fillRect(0, headerH, W, bodyH)

    // QR + subtle shadow
    const qrSize = 188
    const qrX    = (W - qrSize) / 2
    const qrY    = headerH + 16

    ctx.shadowColor   = 'rgba(0,0,0,0.10)'
    ctx.shadowBlur    = 16
    ctx.shadowOffsetY = 4
    ctx.fillStyle     = 'white'
    ctx.beginPath()
    ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
    ctx.fill()
    ctx.shadowColor   = 'transparent'
    ctx.shadowBlur    = 0
    ctx.shadowOffsetY = 0

    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)

    ctx.fillStyle    = '#9CA3AF'
    ctx.font         = `11px ${font}`
    ctx.textBaseline = 'middle'
    ctx.fillText(t('miTienda.general.scanCatalog'), W / 2, qrY + qrSize + 18)

    ctx.fillStyle = config.color_primario
    ctx.font      = `10px monospace`
    const urlDisp = fullUrl.replace('https://', '')
    ctx.fillText(urlDisp.length > 54 ? urlDisp.slice(0, 53) + '…' : urlDisp, W / 2, qrY + qrSize + 36)

    // ── Footer ──
    if (footerH > 0) {
      const sec = config.color_secundario || config.color_primario
      ctx.fillStyle = sec
      ctx.fillRect(0, headerH + bodyH, W, footerH)

      ctx.fillStyle = 'white'
      ctx.font      = `bold 13px ${font}`
      let fy = headerH + bodyH + 30
      for (const item of items) {
        ctx.fillText(item, W / 2, fy)
        fy += 28
      }
      ctx.fillStyle = 'rgba(255,255,255,0.50)'
      ctx.font      = `10px ${font}`
      ctx.fillText('Tienda digital · PyCore ERP', W / 2, H - 12)
    }

    return cv.toDataURL('image/png')
  }

  const downloadQRCard = () => {
    const dataUrl = buildQRCard()
    if (!dataUrl) return
    const link    = document.createElement('a')
    link.download = `qr-${config.slug}.png`
    link.href     = dataUrl
    link.click()
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`🛍️ ${config.nombre_tienda || t('miTienda.title')}\n${fullUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
  }

  const nativeShare = async () => {
    try {
      const dataUrl = buildQRCard()
      if (dataUrl && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `qr-${config.slug}.png`, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: config.nombre_tienda || t('miTienda.title'), files: [file] })
          return
        }
      }
      await navigator.share({ title: config.nombre_tienda || t('miTienda.title'), text: fullUrl, url: fullUrl })
    } catch {}
  }

  const handleSlugChange = (raw: string) => {
    const v = raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60)
    onChange({ slug: v })

    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)

    if (!v || v === savedSlugRef.current) {
      setSlugStatus('idle')
      return
    }

    setSlugStatus('checking')
    slugTimerRef.current = setTimeout(async () => {
      try {
        const { available } = await storefrontApi.checkSlug(v)
        setSlugStatus(available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 600)
  }

  const slugFeedback: Record<Exclude<SlugStatus, 'idle'>, { color: string; icon: React.ReactNode; text: string }> = {
    checking:  { color: 'var(--text-disabled)', icon: <Loader2 size={12} className="animate-spin" />, text: t('miTienda.general.slugChecking') },
    available: { color: '#10B981',              icon: <Check size={12} />,                            text: t('miTienda.general.slugAvailable') },
    taken:     { color: 'var(--color-error)',   icon: <X size={12} />,                               text: t('miTienda.general.slugTaken')     },
  }

  const visibToggles = [
    { key: 'mostrar_precios'       as const, label: t('miTienda.general.showPrices'),      hint: t('miTienda.general.showPricesHint') },
    { key: 'mostrar_stock'         as const, label: t('miTienda.general.showStock'),       hint: t('miTienda.general.showStockHint') },
    { key: 'mostrar_agotados'      as const, label: t('miTienda.general.showOutOfStock'),  hint: t('miTienda.general.showOutOfStockHint') },
    { key: 'pagina_detalle_activa' as const, label: t('miTienda.general.detailPage'),      hint: t('miTienda.general.detailPageHint') },
  ]

  return (
    <div className="layout-sidebar-right-sm">

      {/* ── Columna izquierda: campos ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Slug */}
        <FieldRow label={t('miTienda.general.slugLabel')} hint={t('miTienda.general.slugHint')}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-disabled)', whiteSpace: 'nowrap', flexShrink: 0 }}>/p/</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                type="text"
                value={config.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="mi-tienda"
                maxLength={60}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  border: slugStatus === 'taken'
                    ? '1px solid var(--color-error)'
                    : slugStatus === 'available'
                      ? '1px solid #10B981'
                      : '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text)', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => {
                  if (slugStatus === 'idle') e.target.style.borderColor = 'var(--color-primary)'
                }}
                onBlur={(e) => {
                  if (slugStatus === 'idle') e.target.style.borderColor = 'var(--border)'
                }}
              />
            </div>
          </div>
          {slugStatus !== 'idle' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, marginTop: 4,
              color: slugFeedback[slugStatus].color,
            }}>
              {slugFeedback[slugStatus].icon}
              {slugFeedback[slugStatus].text}
            </div>
          )}
        </FieldRow>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Nombre + Descripción */}
        <FieldRow label={t('miTienda.general.storeName')} hint={t('miTienda.general.storeNameHint')}>
          <InputField
            value={config.nombre_tienda}
            onChange={(v) => onChange({ nombre_tienda: v })}
            placeholder="Ej. Abarrotes Don Pepe"
            maxLength={200}
          />
        </FieldRow>

        <FieldRow label={t('miTienda.general.description')}>
          <textarea
            value={config.descripcion}
            onChange={(e) => onChange({ descripcion: e.target.value })}
            placeholder={t('miTienda.general.descriptionPlaceholder')}
            rows={3}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
              border: '1px solid var(--border)', background: 'var(--surface-hover)',
              color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
          />
        </FieldRow>

        {/* Colores */}
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
          <FieldRow label={t('miTienda.general.primaryColor')}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={config.color_primario}
                onChange={(e) => onChange({ color_primario: e.target.value })}
                style={{ width: 36, height: 36, flexShrink: 0, border: 'none', cursor: 'pointer', borderRadius: 6, padding: 2 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <InputField value={config.color_primario} onChange={(v) => onChange({ color_primario: v })} />
              </div>
            </div>
          </FieldRow>
          <FieldRow label={t('miTienda.general.secondaryColor')}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={config.color_secundario}
                onChange={(e) => onChange({ color_secundario: e.target.value })}
                style={{ width: 36, height: 36, flexShrink: 0, border: 'none', cursor: 'pointer', borderRadius: 6, padding: 2 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <InputField value={config.color_secundario} onChange={(v) => onChange({ color_secundario: v })} />
              </div>
            </div>
          </FieldRow>
        </div>

        {/* Banner */}
        <FieldRow label={t('miTienda.general.bannerLabel')} hint={t('miTienda.general.bannerHint')}>
          <BannerUploader
            currentUrl={config.banner_url}
            onUploaded={onBannerUploaded}
            onDeleted={onBannerDeleted}
          />
        </FieldRow>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Contacto */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>{t('miTienda.general.publicContact')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FieldRow label={t('miTienda.general.whatsapp')} hint={t('miTienda.general.whatsappHint')}>
              <InputField value={config.whatsapp} onChange={(v) => onChange({ whatsapp: v })} placeholder="521XXXXXXXXXX" />
            </FieldRow>
            <FieldRow label={t('miTienda.general.contactEmail')}>
              <InputField value={config.email_pub} onChange={(v) => onChange({ email_pub: v })} placeholder="ventas@tunegocio.com" type="email" />
            </FieldRow>
            <FieldRow label={t('miTienda.general.website')}>
              <InputField value={config.sitio_web} onChange={(v) => onChange({ sitio_web: v })} placeholder="https://..." />
            </FieldRow>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Mercado Pago */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            {t('miTienda.general.mercadoPago')}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-disabled)', marginBottom: 12, overflowWrap: 'break-word' }}>
            {t('miTienda.general.mpDesc')}{' '}
            <a href="https://www.mercadopago.com.mx/developers/panel" target="_blank" rel="noreferrer"
              style={{ color: 'var(--color-primary)' }}>
              developers.mercadopago.com
            </a>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FieldRow label={t('miTienda.general.mpToken')} hint={t('miTienda.general.mpTokenHint')}>
              <InputField
                value={config.mp_access_token ?? ''}
                onChange={(v) => onChange({ mp_access_token: v })}
                placeholder="TEST-xxxxxxxxxxxxxxxxxxxx"
                type="password"
              />
            </FieldRow>
            <FieldRow label={t('miTienda.general.mpMode')} hint={t('miTienda.general.mpModeHint')}>
              <select
                value={config.mp_mode ?? 'sandbox'}
                onChange={(e) => onChange({ mp_mode: e.target.value as 'sandbox' | 'production' })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="sandbox">{t('miTienda.general.mpSandbox')}</option>
                <option value="production">{t('miTienda.general.mpProduction')}</option>
              </select>
            </FieldRow>
          </div>
        </div>

        {/* Guardar */}
        {slugStatus === 'taken' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            fontSize: 12, color: 'var(--color-error)',
          }}>
            <X size={13} />
            {t('miTienda.general.slugError')}
          </div>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || slugStatus === 'taken' || slugStatus === 'checking'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: slugStatus === 'taken' ? 'var(--border)' : 'var(--color-primary)',
            color: slugStatus === 'taken' ? 'var(--text-disabled)' : 'var(--color-primary-text)',
            border: 'none',
            cursor: (saving || slugStatus === 'taken' || slugStatus === 'checking') ? 'not-allowed' : 'pointer',
            opacity: (saving || slugStatus === 'checking') ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          <Save size={15} />
          {saving ? t('miTienda.general.saving') : slugStatus === 'checking' ? t('miTienda.general.checkingSlug') : t('miTienda.general.save')}
        </button>
      </div>

      {/* ── Columna derecha: estado + visibilidad + preview ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>

        {/* Estado toggle */}
        <div style={{
          padding: '16px 18px', borderRadius: 12,
          background: config.activo ? 'rgba(16,185,129,0.06)' : 'var(--surface-hover)',
          border: `1px solid ${config.activo ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {config.activo ? t('miTienda.general.storeActive') : t('miTienda.general.storeInactive')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {config.activo ? t('miTienda.general.storeVisiblePublic') : t('miTienda.general.storeOnlyYou')}
            </p>
          </div>
          <Toggle value={config.activo} onChange={(v) => onChange({ activo: v })} />
        </div>

        {/* Compartir tienda */}
        <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t('miTienda.general.shareStore')}</p>
            <a href={tiendaUrl} target="_blank" rel="noreferrer"
              style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Mini-tarjeta preview */}
          <div ref={qrCanvasRef} style={{ width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
            <div style={{ background: config.color_primario, padding: '12px 16px', textAlign: 'center' }}>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 13, margin: 0, lineHeight: 1.3 }}>
                {config.nombre_tienda || t('miTienda.title')}
              </p>
              {config.descripcion && (
                <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 3, lineHeight: 1.3, margin: '3px 0 0' }}>
                  {config.descripcion.length > 50 ? config.descripcion.slice(0, 49) + '…' : config.descripcion}
                </p>
              )}
            </div>

            <div style={{ background: 'white', padding: '14px 16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <QRCodeCanvas value={fullUrl} size={148} fgColor={config.color_primario} bgColor="white" level="M" />
              <p style={{ fontSize: 9, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>{t('miTienda.general.scanCatalog')}</p>
              <p style={{ fontSize: 9, color: config.color_primario, margin: 0, fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' }}>
                {fullUrl.replace('https://', '')}
              </p>
            </div>

            {(config.whatsapp || config.email_pub) && (
              <div style={{ background: config.color_secundario || config.color_primario, padding: '9px 16px 10px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                {config.whatsapp && (
                  <p style={{ color: 'white', fontSize: 10, fontWeight: 700, margin: 0 }}>💬 {config.whatsapp}</p>
                )}
                {config.email_pub && (
                  <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 10, margin: 0 }}>✉ {config.email_pub}</p>
                )}
              </div>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, width: '100%' }}>
            <button type="button" onClick={copyUrl}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: copied ? 'var(--color-primary)' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? t('miTienda.general.copied') : t('miTienda.general.copy')}
            </button>
            <button type="button" onClick={shareWhatsApp}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', borderRadius: 9, border: '1px solid #25D366', background: '#F0FDF4', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: '#16A34A' }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>💬</span>
              WhatsApp
            </button>
            <button type="button" onClick={downloadQRCard}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
              <Download size={15} />
              {t('miTienda.general.card')}
            </button>
          </div>

          {'share' in navigator && (
            <button type="button" onClick={nativeShare}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <Share2 size={13} /> {t('miTienda.general.share')}
            </button>
          )}
        </div>

        {/* Mini preview de branding */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ background: config.color_primario, padding: '16px 18px' }}>
            {config.banner_url && (
              <div style={{
                height: 60, borderRadius: 8, marginBottom: 12,
                backgroundImage: `url(${config.banner_url})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                🏪
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                  {config.nombre_tienda || t('miTienda.title')}
                </p>
                {config.descripcion && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 1.3 }}>
                    {config.descripcion.slice(0, 50)}{config.descripcion.length > 50 ? '...' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--surface)', display: 'flex', gap: 6 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ flex: 1, height: 56, borderRadius: 6, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                <div style={{ height: 34, background: 'var(--border)', borderRadius: '6px 6px 0 0' }} />
                <div style={{ padding: '4px 6px' }}>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 3 }} />
                  {config.mostrar_precios && (
                    <div style={{ height: 5, width: '60%', background: config.color_primario, borderRadius: 3, opacity: 0.5 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visibilidad */}
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Palette size={13} /> {t('miTienda.general.catalogVisibility')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibToggles.map(({ key, label, hint }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{label}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{hint}</p>
                </div>
                <Toggle value={config[key]} onChange={(v) => onChange({ [key]: v })} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Tab: Productos ─────────────────────────────────────────────────────────

const inputStyleProd = {
  padding: '7px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
  background: 'var(--surface)', border: '1px solid var(--border)',
  color: 'var(--text)', width: '100%', boxSizing: 'border-box' as const,
}

function ProductEditorRow({
  producto,
  isExpanded,
  onToggle,
  onSaved,
}: {
  producto: any
  isExpanded: boolean
  onToggle: () => void
  onSaved:  () => void
}) {
  const { t } = useTranslation()
  const { data: fullProducto, isLoading } = useQuery({
    queryKey: ['producto-full', producto.id],
    queryFn:  () => inventoryApi.obtenerProducto(producto.id),
    enabled:  isExpanded,
    staleTime: 5 * 60 * 1000,
  })

  const [visib,    setVisib]    = useState<VisibilidadPublica>(producto.visibilidad_publica ?? 'privado')
  const [descLarga, setDescLarga] = useState('')
  const [galeria,  setGaleria]  = useState<string[]>([])
  const [ficha,    setFicha]    = useState<FichaTecnicaItem[]>([])
  const [initialized, setInitialized] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [savedOk,  setSavedOk]  = useState(false)
  const [error,    setError]    = useState('')
  const [galeriaUploading, setGaleriaUploading] = useState(false)
  const [showGaleriaUrl,   setShowGaleriaUrl]   = useState(false)
  const [galeriaUrlInput,  setGaleriaUrlInput]  = useState('')
  const galeriaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (fullProducto && !initialized) {
      setDescLarga(fullProducto.descripcion_larga || '')
      setGaleria(fullProducto.galeria_imagenes || [])
      setFicha(fullProducto.ficha_tecnica || [])
      setInitialized(true)
    }
  }, [fullProducto, initialized])

  useEffect(() => {
    if (!isExpanded) { setInitialized(false); setError(''); setSavedOk(false) }
  }, [isExpanded])

  const handleGaleriaUpload = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { setError(t('miTienda.products.errorFormat')); return }
    if (file.size > 5 * 1024 * 1024) { setError(t('miTienda.products.errorSize')); return }
    setGaleriaUploading(true)
    setError('')
    try {
      const result = await inventoryApi.uploadGaleriaImagen(producto.id, file)
      setGaleria(result.galeria_imagenes)
    } catch {
      setError(t('miTienda.products.errorUpload'))
    } finally {
      setGaleriaUploading(false)
      if (galeriaInputRef.current) galeriaInputRef.current.value = ''
    }
  }

  const handleGaleriaDelete = async (index: number) => {
    try {
      const result = await inventoryApi.removeGaleriaImagen(producto.id, index)
      setGaleria(result.galeria_imagenes)
    } catch {
      setError(t('miTienda.products.errorDelete'))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await inventoryApi.actualizarProducto(producto.id, {
        visibilidad_publica: visib as any,
        descripcion_larga:   descLarga,
        ficha_tecnica:       ficha,
        galeria_imagenes:    galeria,
      } as any)
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
      onSaved()
    } catch {
      setError(t('miTienda.products.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const visibOption = VISIB_VALUES.find((o) => o.value === (producto.visibilidad_publica ?? 'privado'))!

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Row header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          cursor: 'pointer', background: isExpanded ? 'rgba(27,174,145,0.04)' : 'var(--surface)',
          transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 6, flexShrink: 0,
          background: 'var(--surface-hover)',
          backgroundImage: producto.imagen_url ? `url(${producto.imagen_url})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!producto.imagen_url && <Package size={14} style={{ color: 'var(--text-disabled)' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {producto.nombre}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
            {producto.categoria_nombre || t('miTienda.products.noCategory')}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: visibOption.color, flexShrink: 0, display: 'none' }} className="hide-xs">
          {t(`miTienda.visibility.${visibOption.value}`)}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-disabled)', flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {/* Inline editor */}
      {isExpanded && (
        <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t('miTienda.products.loadingProduct')}
            </div>
          ) : fullProducto ? (
            <>
              {/* Error */}
              {error && (
                <p style={{ fontSize: 12, color: 'var(--color-error)', padding: '6px 10px', borderRadius: 6, background: 'var(--color-error-bg)' }}>{error}</p>
              )}

              {/* Visibilidad */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{t('miTienda.products.visibilityLabel')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VISIB_VALUES.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setVisib(o.value)}
                      style={{
                        padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${visib === o.value ? o.color : 'var(--border)'}`,
                        background: visib === o.value ? `${o.color}18` : 'var(--surface)',
                        color: visib === o.value ? o.color : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {t(`miTienda.visibility.${o.value}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción larga */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{t('miTienda.products.longDescLabel')}</label>
                <textarea
                  value={descLarga}
                  onChange={(e) => setDescLarga(e.target.value)}
                  rows={4}
                  placeholder={t('miTienda.products.longDescPlaceholder')}
                  style={{ ...inputStyleProd, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Galería */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{t('miTienda.products.galleryLabel')}</label>
                {galeria.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {galeria.map((url, i) => (
                      <div key={i} style={{ position: 'relative', width: 56, height: 56, borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                        <button
                          type="button"
                          onClick={() => handleGaleriaDelete(i)}
                          style={{ position: 'absolute', top: 1, right: 1, background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: 4, width: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                        >
                          <Trash2 size={9} color="white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    disabled={galeriaUploading}
                    onClick={() => galeriaInputRef.current?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: galeriaUploading ? 'var(--surface-hover)' : 'var(--color-primary)',
                      color: galeriaUploading ? 'var(--text-disabled)' : 'var(--color-primary-text)',
                      border: 'none', cursor: galeriaUploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {galeriaUploading
                      ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {t('miTienda.products.uploading')}</>
                      : <><Upload size={12} /> {t('miTienda.products.uploadImage')}</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowGaleriaUrl((v) => !v); setGaleriaUrlInput('') }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <Link size={12} /> {t('miTienda.products.addUrl')}
                  </button>
                </div>
                <input
                  ref={galeriaInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleGaleriaUpload(e.target.files[0])}
                />
                {showGaleriaUrl && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <input
                      type="url"
                      value={galeriaUrlInput}
                      onChange={(e) => setGaleriaUrlInput(e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      style={{ ...inputStyleProd, flex: 1, fontSize: 12 }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && galeriaUrlInput.trim()) {
                          setGaleria((prev) => [...prev, galeriaUrlInput.trim()])
                          setGaleriaUrlInput('')
                          setShowGaleriaUrl(false)
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={!galeriaUrlInput.trim()}
                      onClick={() => {
                        if (galeriaUrlInput.trim()) {
                          setGaleria((prev) => [...prev, galeriaUrlInput.trim()])
                          setGaleriaUrlInput('')
                          setShowGaleriaUrl(false)
                        }
                      }}
                      style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: 'var(--color-primary-text)', cursor: 'pointer', flexShrink: 0, opacity: galeriaUrlInput.trim() ? 1 : 0.5 }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Ficha técnica */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{t('miTienda.products.specsLabel')}</label>
                {ficha.length > 0 && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                    {ficha.map((item, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, padding: '5px 8px', background: i % 2 === 0 ? 'var(--surface-hover)' : 'var(--surface)', borderBottom: i < ficha.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={item.clave}
                          placeholder={t('miTienda.products.specKey')}
                          onChange={(e) => setFicha((prev) => prev.map((r, idx) => idx === i ? { ...r, clave: e.target.value } : r))}
                          style={{ ...inputStyleProd, fontSize: 12, padding: '4px 7px' }}
                        />
                        <input
                          type="text"
                          value={item.valor}
                          placeholder={t('miTienda.products.specValue')}
                          onChange={(e) => setFicha((prev) => prev.map((r, idx) => idx === i ? { ...r, valor: e.target.value } : r))}
                          style={{ ...inputStyleProd, fontSize: 12, padding: '4px 7px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setFicha((prev) => prev.filter((_, idx) => idx !== i))}
                          style={{ padding: '4px 6px', borderRadius: 5, border: 'none', background: 'transparent', color: 'var(--color-error)', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setFicha((prev) => [...prev, { clave: '', valor: '' }])}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                >
                  <Plus size={12} /> {t('miTienda.products.addSpec')}
                </button>
              </div>

              {/* Guardar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px',
                    borderRadius: 9, fontSize: 13, fontWeight: 600,
                    background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                    border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  }}
                >
                  <Save size={13} /> {saving ? t('miTienda.products.saving') : t('miTienda.products.save')}
                </button>
                {savedOk && (
                  <span style={{ fontSize: 12, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={13} /> {t('miTienda.products.saved')}
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

function TabProductos({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  const productosQuery = useQuery({
    queryKey: ['inventory-all'],
    queryFn:  () => inventoryApi.listarProductos({}),
  })

  const productos = (productosQuery.data as any)?.results ?? productosQuery.data ?? []
  const filtrados = productos.filter((p: any) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['inventory-all'] })
    onSaved()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Info */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8,
        background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)',
      }}>
        <Info size={14} style={{ color: '#60A5FA', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {t('miTienda.products.hint')}
        </p>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('miTienda.products.searchPlaceholder')}
          style={{
            width: '100%', padding: '8px 12px 8px 30px', borderRadius: 8, fontSize: 13,
            border: '1px solid var(--border)', background: 'var(--surface-hover)', color: 'var(--text)', outline: 'none',
          }}
        />
      </div>

      {/* Lista */}
      <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {productosQuery.isLoading ? (
          <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{t('miTienda.products.loading')}</p>
        ) : filtrados.length === 0 ? (
          <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{t('miTienda.products.noResults')}</p>
        ) : filtrados.map((p: any) => (
          <ProductEditorRow
            key={p.id}
            producto={p}
            isExpanded={expandedId === p.id}
            onToggle={() => handleToggle(p.id)}
            onSaved={handleSaved}
          />
        ))}
      </div>
    </div>
  )
}

// ── Tab: Pedidos ────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const { t } = useTranslation()
  const e = ESTADOS_PEDIDO_VALUES.find((x) => x.value === estado) ?? ESTADOS_PEDIDO_VALUES[0]
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, color: e.color, background: e.bg,
      whiteSpace: 'nowrap',
    }}>
      {t(`miTienda.orders.statuses.${e.value}`, { defaultValue: e.value })}
    </span>
  )
}

function TabPedidos() {
  const { t } = useTranslation()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [expandido,    setExpandido]    = useState<string | null>(null)
  const [updatingId,   setUpdatingId]   = useState<string | null>(null)

  const { data: pedidos = [], isLoading, refetch } = useQuery({
    queryKey: ['storefront-pedidos-erp', filtroEstado],
    queryFn:  () => storefrontApi.getPedidos(filtroEstado ? { estado: filtroEstado } : undefined),
    refetchInterval: 30_000,
  })

  const handleEstado = async (pedidoId: string, nuevoEstado: string) => {
    setUpdatingId(pedidoId)
    try {
      await storefrontApi.updateEstadoPedido(pedidoId, nuevoEstado)
      refetch()
    } finally {
      setUpdatingId(null)
    }
  }

  const fmt = (n: string) => parseFloat(n).toLocaleString(undefined, { minimumFractionDigits: 2 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filtro por estado */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFiltroEstado('')}
          style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: !filtroEstado ? 'var(--color-primary)' : 'var(--surface-hover)',
            color: !filtroEstado ? 'var(--color-primary-text)' : 'var(--text-secondary)',
          }}
        >
          {t('miTienda.orders.all')}
        </button>
        {ESTADOS_PEDIDO_VALUES.filter((e) => ['pendiente', 'apartado', 'pagado', 'en_proceso', 'listo'].includes(e.value)).map((e) => (
          <button
            key={e.value}
            onClick={() => setFiltroEstado(e.value)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: `1px solid ${filtroEstado === e.value ? e.color : 'transparent'}`,
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: filtroEstado === e.value ? e.bg : 'var(--surface-hover)',
              color: filtroEstado === e.value ? e.color : 'var(--text-secondary)',
            }}
          >
            {t(`miTienda.orders.statuses.${e.value}`, { defaultValue: e.value })}
          </button>
        ))}
      </div>

      {isLoading && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('miTienda.orders.loading')}</p>}

      {!isLoading && pedidos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📦</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{t('miTienda.orders.noOrders')}</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            {filtroEstado ? t('miTienda.orders.noOrdersFiltered') : t('miTienda.orders.noOrdersEmpty')}
          </p>
        </div>
      )}

      {pedidos.map((p) => {
        const isOpen = expandido === p.id
        const esMp   = p.metodo_pago === 'mercado_pago'
        return (
          <div key={p.id} style={{
            border: '1px solid var(--border)', borderRadius: 12,
            background: 'var(--surface)', overflow: 'hidden',
          }}>
            {/* Cabecera del pedido */}
            <div
              onClick={() => setExpandido(isOpen ? null : p.id)}
              style={{
                padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', letterSpacing: 1 }}>
                    {p.numero_pedido}
                  </span>
                  <EstadoBadge estado={p.estado} />
                  <span style={{ fontSize: 11, color: 'var(--text-disabled)', marginLeft: 'auto' }}>
                    {new Date(p.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {p.cliente_nombre}
                  {p.cliente_telefono && <> · {p.cliente_telefono}</>}
                  {' · '}
                  <strong style={{ color: 'var(--text)' }}>${fmt(p.total)}</strong>
                  {' · '}
                  {esMp ? t('miTienda.orders.mp') : t('miTienda.orders.cash')}
                </p>
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-disabled)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
            </div>

            {/* Detalle expandido */}
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                {/* Items */}
                <div style={{ marginBottom: 14 }}>
                  {p.detalles.map((d) => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
                      <span>{d.nombre_snapshot} <span style={{ color: 'var(--text-disabled)' }}>×{d.cantidad}</span></span>
                      <span style={{ fontWeight: 600 }}>${fmt(d.subtotal)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4 }}>
                    <span>{t('miTienda.orders.total')}</span>
                    <span>${fmt(p.total)}</span>
                  </div>
                </div>

                {p.notas_cliente && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-hover)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    📝 {p.notas_cliente}
                  </div>
                )}

                {/* Cambiar estado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('miTienda.orders.changeStatus')}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ESTADOS_PEDIDO_VALUES.filter((e) => e.value !== p.estado).map((e) => (
                      <button
                        key={e.value}
                        onClick={() => handleEstado(p.id, e.value)}
                        disabled={updatingId === p.id}
                        style={{
                          padding: '5px 12px', borderRadius: 8, border: `1px solid ${e.color}`,
                          background: 'transparent', color: e.color, fontSize: 11, fontWeight: 600,
                          cursor: updatingId === p.id ? 'not-allowed' : 'pointer',
                          opacity: updatingId === p.id ? 0.5 : 1,
                        }}
                      >
                        → {t(`miTienda.orders.statuses.${e.value}`, { defaultValue: e.value })}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tab: Preview ───────────────────────────────────────────────────────────

function TabPreview({ config }: { config: StorefrontConfig }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8,
        background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)',
      }}>
        <Eye size={14} style={{ color: '#60A5FA', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t('miTienda.preview.hint')}{' '}
          <a href={`/p/${config.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
            /p/{config.slug}
          </a>
        </p>
      </div>

      {/* Mini preview del branding */}
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}>
        {/* Header de la tienda */}
        <div style={{
          background: config.color_primario,
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={22} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
              {config.nombre_tienda || t('miTienda.title')}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {config.descripcion || '...'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{
              padding: '4px 10px', borderRadius: 20,
              background: config.activo ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              color: 'white', fontSize: 11, fontWeight: 600,
            }}>
              {config.activo ? `● ${t('miTienda.preview.open')}` : `● ${t('miTienda.preview.closed')}`}
            </div>
          </div>
        </div>

        {/* Productos placeholder */}
        <div style={{ padding: 16, background: 'var(--bg)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{t('miTienda.preview.catalog')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                borderRadius: 8, background: 'var(--surface)',
                border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                <div style={{ height: 60, background: 'var(--surface-hover)' }} />
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, marginBottom: 5 }} />
                  {config.mostrar_precios && (
                    <div style={{ height: 7, width: '60%', background: config.color_primario, borderRadius: 4, opacity: 0.4 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────

export function MiTiendaPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('general')
  const { configQuery, updateMutation } = useStorefront()
  const qc = useQueryClient()

  const config = configQuery.data
  const [localConfig, setLocalConfig] = useState<StorefrontConfig | null>(null)
  const effective = localConfig ?? config

  const handleChange = useCallback((partial: Partial<StorefrontConfig>) => {
    setLocalConfig((prev) => ({ ...(prev ?? config!), ...partial }))
  }, [config])

  const handleSave = async () => {
    if (!localConfig) return
    await updateMutation.mutateAsync(localConfig)
    setLocalConfig(null)
  }

  const handleBannerUploaded = useCallback((url: string) => {
    qc.setQueryData<StorefrontConfig>(['storefront-config'], (old) =>
      old ? { ...old, banner_url: url } : old
    )
    setLocalConfig((prev) => prev ? { ...prev, banner_url: url } : null)
  }, [qc])

  const handleBannerDeleted = useCallback(() => {
    qc.setQueryData<StorefrontConfig>(['storefront-config'], (old) =>
      old ? { ...old, banner_url: '' } : old
    )
    setLocalConfig((prev) => prev ? { ...prev, banner_url: '' } : null)
  }, [qc])

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'general',   label: t('miTienda.tabs.general'),  icon: Settings },
    { key: 'productos', label: t('miTienda.tabs.products'), icon: Package },
    { key: 'pedidos',   label: t('miTienda.tabs.orders'),   icon: ShoppingBag },
  ]

  if (configQuery.isLoading) {
    return (
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('miTienda.loading')}</p>
      </div>
    )
  }

  if (!effective) return null

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
          border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-primary)',
        }}>
          <Globe size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold" style={{ fontSize: 16, color: 'var(--text)' }}>{t('miTienda.title')}</h2>
            {effective.activo && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px',
                borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#10B981',
                flexShrink: 0,
              }}>
                {t('miTienda.online')}
              </span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('miTienda.configurePublic')}{' '}
            <a href={`/p/${effective.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
              /p/{effective.slug || '...'}
            </a>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === key ? 'var(--color-primary)' : 'var(--surface-hover)',
                color: tab === key ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        {localConfig && (
          <span className="w-fit" style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--color-warning)', padding: '3px 10px', borderRadius: 20,
            background: 'rgba(245,158,11,0.1)',
          }}>
            {t('miTienda.unsavedChanges')}
          </span>
        )}
      </div>

      {/* Contenido del tab */}
      {tab === 'general' && (
        <TabGeneral
          config={effective}
          onChange={handleChange}
          onSave={handleSave}
          saving={updateMutation.isPending}
          onBannerUploaded={handleBannerUploaded}
          onBannerDeleted={handleBannerDeleted}
        />
      )}
      {tab === 'productos' && (
        <TabProductos onSaved={() => {}} />
      )}
      {tab === 'pedidos' && (
        <TabPedidos />
      )}
      {tab === 'preview' && (
        <TabPreview config={effective} />
      )}
    </div>
  )
}
