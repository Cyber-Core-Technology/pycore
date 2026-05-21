import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Camera, Search, Loader2, CheckCircle2, AlertCircle, Package } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { useBarcodeScanner, useScanSession } from '@/hooks/useInventory'
import type { BarcodeLookupResult } from '@/types/inventory.types'

export type BarcodeScannerMode = 'venta' | 'inventario'

interface Props {
  mode:        BarcodeScannerMode
  onFound:     (result: BarcodeLookupResult) => void
  onNotFound?: (codigo: string) => void
  onClose:     () => void
}

type ScanState = 'idle' | 'scanning' | 'processing' | 'found' | 'not_found' | 'error' | 'manual' | 'added'

export function BarcodeScannerModal({ mode, onFound, onNotFound, onClose }: Props) {
  const videoRef        = useRef<HTMLVideoElement>(null)
  const readerRef       = useRef<BrowserMultiFormatReader | null>(null)
  const cooldownRef     = useRef(false)

  const [scanState,    setScanState]    = useState<ScanState>('idle')
  const [resultado,    setResultado]    = useState<BarcodeLookupResult | null>(null)
  const [codigoManual, setCodigoManual] = useState('')
  const [cameraError,  setCameraError]  = useState<string | null>(null)
  const [addedName,    setAddedName]    = useState('')

  const { buscar, loading } = useBarcodeScanner()
  const { qr, esperando, error: sessionError, iniciar, detener } = useScanSession()
  const [tab, setTab] = useState<'camara' | 'celular'>('camara')

  useEffect(() => {
    iniciarCamara()
    return () => { detenerCamara(); detener() }
  }, [])

  const iniciarCamara = async () => {
    setScanState('scanning')
    setCameraError(null)
    try {
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      if (devices.length === 0) throw new Error('NoCamera')

      const device = devices.find((d) =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      ) ?? devices[devices.length - 1]

      await reader.decodeFromVideoDevice(
        device.deviceId,
        videoRef.current!,
        async (result, err) => {
          if (result && !cooldownRef.current) {
            cooldownRef.current = true
            await procesarCodigo(result.getText())
            setTimeout(() => { cooldownRef.current = false }, 2500)
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('ZXing scan error:', err)
          }
        }
      )
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Usa el modo manual.'
        : e?.message === 'NoCamera'
          ? 'No se encontró cámara. Usa el modo manual.'
          : 'No se pudo acceder a la cámara. Usa el modo manual.'
      setCameraError(msg)
      setScanState('manual')
    }
  }

  const detenerCamara = () => {
    if (readerRef.current) {
      try { (readerRef.current as any).reset() } catch {}
      readerRef.current = null
    }
  }

  const procesarCodigo = async (codigo: string) => {
    setScanState('processing')
    const result = await buscar(codigo)
    if (!result) { setScanState('error'); return }
    setResultado(result)

    if (result.encontrado && result.origen === 'interno' && mode === 'venta') {
      // Auto-agregar sin confirmación — mejor UX para escaneo continuo
      onFound(result)
      setAddedName(result.producto.nombre)
      setScanState('added')
      // Tras 1.5s, resetear para escanear otro
      setTimeout(() => {
        setResultado(null)
        setAddedName('')
        setScanState('scanning')
      }, 1500)
    } else if (result.encontrado) {
      setScanState('found')
    } else {
      setScanState('not_found')
      onNotFound?.(codigo)
    }
  }

  const handleManualSubmit = () => {
    if (!codigoManual.trim()) return
    procesarCodigo(codigoManual.trim())
    setCodigoManual('')
  }

  const handleConfirmar = () => {
    if (resultado) {
      onFound(resultado)
      if (mode === 'venta') {
        // Quedarse abierto para escanear otro
        setResultado(null)
        setScanState(cameraError ? 'manual' : 'scanning')
        if (!cameraError) {
          detenerCamara()
          setTimeout(iniciarCamara, 200)
        }
      } else {
        onClose()
      }
    }
  }

  const handleReintentar = () => {
    setResultado(null)
    setCodigoManual('')
    detenerCamara()
    if (cameraError) {
      setScanState('manual')
    } else {
      setTimeout(iniciarCamara, 200)
    }
  }

  const isResult  = ['found', 'not_found', 'error'].includes(scanState)

  // ─── SIEMPRE portal a document.body con position:fixed ───────────────────
  return createPortal(
    <>
      {/* Backdrop — position:fixed sobre todo */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 10000,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(480px, 95vw)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
        zIndex: 10001,
        overflow: 'hidden',
        animation: 'bsModalEnter 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        flexDirection: 'column',
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
              <Camera size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                Escanear código de barras
              </p>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {(['camara', 'celular'] as const).map((t) => (
                  <button key={t} onClick={() => {
                    setTab(t)
                    if (t === 'celular') { detenerCamara(); iniciar((r) => { onFound(r); onClose() }) }
                    else { detener(); iniciarCamara() }
                  }} style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: tab === t ? 'var(--color-primary)' : 'var(--surface-hover)',
                    color: tab === t ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                  }}>
                    {t === 'camara' ? '📷 Esta cámara' : '📱 Usar celular'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8,
            background: 'var(--surface-hover)', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Flash de producto agregado */}
          {scanState === 'added' && (
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle2 size={20} style={{ color: '#10B981', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#10B981', margin: 0 }}>¡Agregado!</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{addedName}</p>
              </div>
            </div>
          )}

          {/* Vista cámara */}
          {tab === 'camara' && !isResult && scanState !== 'manual' && scanState !== 'added' && (
            <div style={{
              position: 'relative', borderRadius: 14, overflow: 'hidden',
              background: '#000', aspectRatio: '4/3',
            }}>
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Marco de escaneo */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: '65%', aspectRatio: '3/2',
                  border: '2px solid var(--color-primary)',
                  borderRadius: 12,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                  position: 'relative',
                }}>
                  {scanState === 'scanning' && (
                    <div style={{
                      position: 'absolute', left: 4, right: 4, height: 2,
                      background: 'var(--color-primary)',
                      borderRadius: 1,
                      animation: 'bsScanLine 2s ease-in-out infinite',
                    }} />
                  )}
                </div>
              </div>

              {/* Processing overlay */}
              {scanState === 'processing' && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <Loader2 size={32} style={{ color: 'var(--color-primary)', animation: 'bsSpin 1s linear infinite' }} />
                  <p style={{ color: '#fff', fontSize: 13 }}>Consultando producto...</p>
                </div>
              )}

              {scanState === 'scanning' && (
                <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center' }}>
                  <span style={{
                    fontSize: 11, color: '#fff',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '4px 12px', borderRadius: 20,
                  }}>
                    {mode === 'venta' ? 'Apunta al código · se agrega automáticamente' : 'Apunta al código de barras'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab celular — QR */}
          {tab === 'celular' && !isResult && (
            <div style={{
              borderRadius: 14, border: '1px solid var(--border)',
              overflow: 'hidden', background: 'var(--surface-hover)',
            }}>
              {qr ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, gap: 12 }}>
                  <img
                    src={`data:image/png;base64,${qr}`}
                    alt="QR escaneo"
                    style={{ width: 180, height: 180, borderRadius: 10 }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
                    Escanea este QR con la cámara de tu celular
                  </p>
                  {esperando && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-primary)' }}>
                      <Loader2 size={13} style={{ animation: 'bsSpin 1s linear infinite' }} />
                      Esperando escaneo del celular...
                    </div>
                  )}
                  {sessionError && (
                    <div style={{
                      fontSize: 12, color: '#F87171', padding: '6px 12px',
                      background: 'var(--color-error-bg)', borderRadius: 8,
                      border: '1px solid rgba(239,68,68,0.15)',
                    }}>
                      {sessionError}
                    </div>
                  )}
                  <button
                    onClick={() => iniciar((r) => { onFound(r); onClose() })}
                    style={{
                      fontSize: 11, padding: '6px 14px', borderRadius: 8,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', cursor: 'pointer',
                    }}
                  >
                    Generar nuevo QR
                  </button>
                </div>
              ) : (
                <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Loader2 size={24} style={{ color: 'var(--color-primary)', animation: 'bsSpin 1s linear infinite' }} />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Generando QR...</p>
                </div>
              )}
            </div>
          )}

          {/* Error cámara */}
          {cameraError && !isResult && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 12,
              background: 'var(--color-error-bg)', color: '#F87171',
              border: '1px solid rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {cameraError}
            </div>
          )}

          {/* Resultado (confirmación manual: externo o inventario-mode) */}
          {isResult && resultado && (
            <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{
                padding: '8px 14px', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                background: resultado.origen === 'interno'
                  ? 'rgba(24,174,145,0.1)'
                  : resultado.origen === 'externo'
                    ? 'rgba(251,191,36,0.1)'
                    : 'var(--color-error-bg)',
                color: resultado.origen === 'interno'
                  ? 'var(--color-primary)'
                  : resultado.origen === 'externo'
                    ? 'var(--color-warning)'
                    : '#F87171',
              }}>
                {resultado.origen === 'interno'       && <><CheckCircle2 size={13} /> En tu inventario</>}
                {resultado.origen === 'externo'       && <><AlertCircle  size={13} /> Encontrado en base pública — no está en tu inventario</>}
                {resultado.origen === 'no_encontrado' && <><AlertCircle  size={13} /> Código no encontrado</>}
              </div>

              {resultado.encontrado ? (
                <div style={{
                  padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: 'var(--surface-hover)',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {resultado.producto.imagen_url ? (
                      <img
                        src={resultado.producto.imagen_url}
                        alt={resultado.producto.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <Package size={22} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {resultado.producto.nombre}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {resultado.producto.codigo_barras}
                    </p>
                    {resultado.producto.categoria && (
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {resultado.producto.categoria}
                      </p>
                    )}
                    {resultado.producto.precio_venta !== null && (
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', marginTop: 6 }}>
                        ${Number(resultado.producto.precio_venta).toFixed(2)}
                      </p>
                    )}
                    {resultado.producto.meta && (
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {resultado.producto.meta.marca}
                        {resultado.producto.meta.cantidad && ` · ${resultado.producto.meta.cantidad}`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 14, background: 'var(--surface-hover)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>
                    Código: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {resultado.producto.codigo_barras}
                    </span>
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {mode === 'inventario'
                      ? 'Puedes crear el producto manualmente con este código.'
                      : 'Este producto no está registrado en el sistema.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Input manual */}
          {tab === 'camara' && scanState !== 'added' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-secondary)',
              }}>
                {scanState === 'manual' ? 'Ingresa el código' : 'O ingresa el código manualmente'}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={13} style={{
                    position: 'absolute', left: 10, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-secondary)',
                  }} />
                  <input
                    type="text"
                    placeholder="Ej: 7501055300051"
                    value={codigoManual}
                    onChange={(e) => setCodigoManual(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    autoFocus={scanState === 'manual'}
                    style={{
                      width: '100%', paddingLeft: 32, paddingRight: 12,
                      paddingTop: 9, paddingBottom: 9,
                      borderRadius: 8, fontSize: 13, outline: 'none',
                      background: 'var(--surface-hover)', border: '1px solid var(--border)',
                      color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'monospace',
                    }}
                  />
                </div>
                <button
                  onClick={handleManualSubmit}
                  disabled={!codigoManual.trim() || loading}
                  style={{
                    padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: !codigoManual.trim() || loading
                      ? 'rgba(24,174,145,0.3)' : 'var(--color-primary)',
                    color: 'var(--color-primary-text)', border: 'none',
                    cursor: !codigoManual.trim() || loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  }}
                >
                  {loading && <Loader2 size={14} style={{ animation: 'bsSpin 1s linear infinite' }} />}
                  Buscar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          background: 'var(--surface)',
        }}>
          {isResult && (
            <button onClick={handleReintentar} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--surface-hover)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>
              Escanear otro
            </button>
          )}

          {/* Confirmar solo para externo en venta, o cualquier found en inventario */}
          {scanState === 'found' && resultado?.encontrado && (
            <button onClick={handleConfirmar} style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--color-primary)', color: 'var(--color-primary-text)',
              border: 'none', cursor: 'pointer',
            }}>
              {mode === 'venta' ? 'Agregar a la venta' : 'Usar este producto'}
            </button>
          )}

          {scanState === 'not_found' && mode === 'inventario' && (
            <button onClick={handleConfirmar} style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--color-primary)', color: 'var(--color-primary-text)',
              border: 'none', cursor: 'pointer',
            }}>
              Crear producto con este código
            </button>
          )}

          {!isResult && scanState !== 'added' && (
            <button onClick={onClose} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--surface-hover)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>
              Cerrar
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bsScanLine {
          0%   { top: 4px; }
          50%  { top: calc(100% - 6px); }
          100% { top: 4px; }
        }
        @keyframes bsSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bsModalEnter {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>,
    document.body
  )
}
