import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { api } from '@/api/axios-config'
import { Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type PageState = 'iniciando' | 'escaneando' | 'enviando' | 'ok' | 'error' | 'expirado'

export function ScanPage() {
  const { token }   = useParams<{ token: string }>()
  const videoRef    = useRef<HTMLVideoElement>(null)
  const readerRef   = useRef<BrowserMultiFormatReader | null>(null)
  const cooldownRef = useRef(false)

  const [state,   setState]   = useState<PageState>('iniciando')
  const [codigo,  setCodigo]  = useState('')
  const [error,   setError]   = useState('')

  useEffect(() => {
    iniciarCamara()
    return () => detenerCamara()
  }, [])

  const iniciarCamara = async () => {
    setState('iniciando')
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
            await enviarResultado(result.getText())
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('scan error:', err)
          }
        }
      )
      setState('escaneando')
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Por favor permite el acceso a la cámara.'
        : e?.message === 'NoCamera'
          ? 'No se encontró cámara en este dispositivo.'
          : 'No se pudo acceder a la cámara.'
      setError(msg)
      setState('error')
    }
  }

  const enviarResultado = async (codigoEscaneado: string) => {
    setState('enviando')
    setCodigo(codigoEscaneado)
    detenerCamara()
    try {
      await api.post(
        `/api/v1/inventory/scan-session/${token}/resultado/`,
        { codigo_barras: codigoEscaneado },
        { headers: { Authorization: undefined } } // endpoint público
      )
      setState('ok')
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setState('expirado')
      } else {
        setError('Error al enviar el resultado. Intenta de nuevo.')
        setState('error')
        cooldownRef.current = false
      }
    }
  }

  const detenerCamara = () => {
    if (readerRef.current) {
      try { (readerRef.current as any).reset() } catch {}
      readerRef.current = null
    }
  }

  const handleReintentar = () => {
    cooldownRef.current = false
    setCodigo('')
    setError('')
    iniciarCamara()
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-primary-text)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Logo / Header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#18AE91', marginBottom: 4 }}>
          PyCore
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Escáner de código de barras
        </p>
      </div>

      {/* Card principal */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#132318',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
      }}>

        {/* Vista cámara */}
        {(state === 'iniciando' || state === 'escaneando' || state === 'enviando') && (
          <div style={{ position: 'relative', aspectRatio: '1', background: '#000' }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />

            {/* Marco */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '70%', aspectRatio: '3/2',
                border: '2px solid #18AE91',
                borderRadius: 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                position: 'relative',
              }}>
                {state === 'escaneando' && (
                  <div style={{
                    position: 'absolute', left: 4, right: 4, height: 2,
                    background: '#18AE91', borderRadius: 1,
                    animation: 'scanLine 2s ease-in-out infinite',
                  }} />
                )}
              </div>
            </div>

            {/* Overlay enviando */}
            {state === 'enviando' && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                <Loader2 size={36} style={{ color: '#18AE91', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#fff', fontSize: 14 }}>Enviando a la PC...</p>
              </div>
            )}

            {/* Hint */}
            {state === 'escaneando' && (
              <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                <span style={{
                  fontSize: 12, color: '#fff',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '5px 14px', borderRadius: 20,
                }}>
                  Apunta al código de barras
                </span>
              </div>
            )}

            {/* Iniciando */}
            {state === 'iniciando' && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={32} style={{ color: '#18AE91', animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>
        )}

        {/* Estado: OK */}
        {state === 'ok' && (
          <div style={{
            padding: 32, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 16, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(24,174,145,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={32} style={{ color: '#18AE91' }} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                ¡Código enviado!
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                {codigo}
              </p>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              El producto ya aparece en la PC. Puedes cerrar esta página.
            </p>
            <button
              onClick={handleReintentar}
              style={{
                marginTop: 8, padding: '10px 24px', borderRadius: 10,
                background: '#18AE91', color: 'var(--color-primary-text)',
                border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
              }}
            >
              Escanear otro
            </button>
          </div>
        )}

        {/* Estado: Expirado */}
        {state === 'expirado' && (
          <div style={{
            padding: 32, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 16, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertCircle size={32} style={{ color: 'var(--color-error)' }} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                Sesión expirada
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                El código QR ya no es válido. Genera uno nuevo desde la PC.
              </p>
            </div>
          </div>
        )}

        {/* Estado: Error */}
        {state === 'error' && (
          <div style={{
            padding: 32, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 16, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Camera size={32} style={{ color: 'var(--color-error)' }} />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                Error de cámara
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
            <button
              onClick={handleReintentar}
              style={{
                padding: '10px 24px', borderRadius: 10,
                background: '#18AE91', color: 'var(--color-primary-text)',
                border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
              }}
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Footer info */}
        {(state === 'escaneando' || state === 'iniciando') && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              Sesión válida por 5 minutos · PyCore ERP
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 4px; }
          50%  { top: calc(100% - 6px); }
          100% { top: 4px; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
