import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Upload, Download, FileSpreadsheet, RefreshCw,
  CheckCircle, AlertCircle, MinusCircle, ArrowLeft, ChevronRight,
} from 'lucide-react'

// ── Tipos públicos ──────────────────────────────────────────────────────────
export type ImportEstado = 'valido' | 'error' | 'omitido'

export interface ImportColumn {
  key:       string
  label:     string                       // encabezado corto en la tabla
  required?: boolean
  type?:     'text' | 'number' | 'select'
  options?:  string[]                      // para type='select'
  width?:    number
}

export interface ImportFila {
  fila:         number
  estado:       ImportEstado
  error_campo?: string | null
  mensaje?:     string | null
  [key: string]: string | number | null | undefined
}

export interface ImportPreviewResultado {
  total:       number
  validos:     number
  con_errores: number
  omitidos:    number
  filas:       ImportFila[]
}

export interface ImportFilaResultado {
  fila:     number
  nombre:   string
  estado:   string
  mensaje?: string | null
}

export interface ImportResultado {
  creados:  number
  omitidos: number
  errores:  number
  filas:    ImportFilaResultado[]
}

interface Props {
  titulo:           string                 // "Importar proveedores"
  entidadSingular:  string                 // "proveedor"
  entidadPlural:    string                 // "proveedores"
  uniqueKey:        string                 // campo que identifica duplicados (ej. "nombre_comercial")
  columns:          ImportColumn[]
  descargarPlantilla: () => Promise<void>
  previsualizar:    (archivo: File) => Promise<ImportPreviewResultado>
  importar:         (filas: ImportFila[], modo: 'atomico' | 'parcial') => Promise<ImportResultado>
  onClose:          () => void
  onSuccess:        () => void
}

type Step = 'config' | 'analyzing' | 'preview' | 'importing' | 'results'
type Modo = 'atomico' | 'parcial'

// ── Re-validación client-side ───────────────────────────────────────────────
function revalidarFila(
  fila:              ImportFila,
  columns:           ImportColumn[],
  uniqueKey:         string,
  nombresExistentes: Set<string>,
  nombresOtrasFilas: Set<string>,
): ImportFila {
  const nombre = String(fila[uniqueKey] ?? '').trim()

  if (!nombre) {
    return { ...fila, estado: 'error', error_campo: uniqueKey, mensaje: 'El nombre es obligatorio.' }
  }
  if (nombresExistentes.has(nombre.toLowerCase()) || nombresOtrasFilas.has(nombre.toLowerCase())) {
    return { ...fila, estado: 'omitido', error_campo: undefined, mensaje: 'Ya existe un registro con ese nombre.' }
  }

  for (const c of columns) {
    const v = String(fila[c.key] ?? '').trim()
    if (!v) {
      if (c.required && c.key !== uniqueKey) {
        return { ...fila, estado: 'error', error_campo: c.key, mensaje: `"${c.label}" es obligatorio.` }
      }
      continue
    }
    if (c.type === 'number') {
      const n = parseFloat(v.replace(',', '.'))
      if (isNaN(n)) {
        return { ...fila, estado: 'error', error_campo: c.key, mensaje: `"${v}" debe ser un número.` }
      }
    }
    if (c.type === 'select' && c.options && c.options.length > 0 && !c.options.includes(v.toLowerCase())) {
      return { ...fila, estado: 'error', error_campo: c.key, mensaje: `"${v}" no válido.` }
    }
  }

  return { ...fila, estado: 'valido', error_campo: undefined, mensaje: undefined }
}

// ── Componente principal ────────────────────────────────────────────────────
export function ImportModal({
  titulo, entidadSingular, entidadPlural, uniqueKey, columns,
  descargarPlantilla, previsualizar, importar, onClose, onSuccess,
}: Props) {
  const [step,        setStep]        = useState<Step>('config')
  const [modo,        setModo]        = useState<Modo>('parcial')
  const [archivo,     setArchivo]     = useState<File | null>(null)
  const [dragging,    setDragging]    = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)

  const [previewFilas,      setPreviewFilas] = useState<ImportFila[]>([])
  const [nombresExistentes, setNombresExist] = useState<Set<string>>(new Set())
  const [resultado,         setResultado]    = useState<ImportResultado | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv'))) {
      setArchivo(file); setErrorGlobal(null)
    } else {
      setErrorGlobal('Solo se aceptan archivos .xlsx o .csv.')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file) { setArchivo(file); setErrorGlobal(null) }
  }

  const handleDescargar = async () => {
    setDescargando(true)
    try { await descargarPlantilla() }
    catch { setErrorGlobal('No se pudo descargar la plantilla.') }
    finally { setDescargando(false) }
  }

  const handleAnalizar = async () => {
    if (!archivo) return
    setStep('analyzing'); setErrorGlobal(null)
    try {
      const res = await previsualizar(archivo)
      setPreviewFilas(res.filas)
      const existentes = new Set<string>(
        res.filas.filter(f => f.estado === 'omitido').map(f => String(f[uniqueKey] ?? '').toLowerCase())
      )
      setNombresExist(existentes)
      setStep('preview')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErrorGlobal(msg ?? 'Error al analizar el archivo.')
      setStep('config')
    }
  }

  const updateFila = (rowIndex: number, field: string, value: string) => {
    setPreviewFilas(prev => {
      const next = prev.map((f, i) => i === rowIndex ? { ...f, [field]: value } : f)
      const nombresOtrasFilas = new Set(
        next.filter((_, i) => i !== rowIndex)
          .map(f => String(f[uniqueKey] ?? '').trim().toLowerCase()).filter(Boolean)
      )
      next[rowIndex] = revalidarFila(next[rowIndex], columns, uniqueKey, nombresExistentes, nombresOtrasFilas)
      return next
    })
  }

  const handleImportar = async () => {
    const filasParaImportar = previewFilas.filter(f => f.estado !== 'omitido')
    if (filasParaImportar.length === 0) return
    setStep('importing')
    try {
      const res = await importar(filasParaImportar, modo)
      setResultado(res); setStep('results')
      if (res.creados > 0) onSuccess()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: ImportResultado } })?.response?.data
      if (data?.filas) {
        setResultado({ creados: data.creados ?? 0, omitidos: data.omitidos ?? 0, errores: data.errores ?? 0, filas: data.filas })
        setStep('results')
      } else {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setErrorGlobal(msg ?? 'Error al importar.')
        setStep('preview')
      }
    }
  }

  const handleClose = () => { if (step !== 'analyzing' && step !== 'importing') onClose() }

  const validos    = previewFilas.filter(f => f.estado === 'valido').length
  const conErrores = previewFilas.filter(f => f.estado === 'error').length
  const omitidos   = previewFilas.filter(f => f.estado === 'omitido').length
  const puedeImportar = modo === 'atomico' ? conErrores === 0 && validos > 0 : validos > 0

  const modalWidth = step === 'preview' ? 'min(1040px, 97vw)' : 'min(520px, 94vw)'

  return createPortal(
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: modalWidth, maxHeight: '92vh',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'modalEnter 0.2s ease', transition: 'width 0.25s ease',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(27,174,145,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{titulo}</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                {step === 'config'    && 'Sube un archivo .xlsx o .csv'}
                {step === 'analyzing' && 'Analizando archivo…'}
                {step === 'preview'   && `${previewFilas.length} filas detectadas`}
                {step === 'importing' && `Creando ${entidadPlural}…`}
                {step === 'results'   && 'Resultado de la importación'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
            {(['config', 'preview', 'results'] as const).map((s, idx) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {idx > 0 && <ChevronRight size={10} />}
                <span style={{ fontWeight: step === s ? 700 : 400, color: step === s ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                  {s === 'config' ? '1. Subir' : s === 'preview' ? '2. Revisar' : '3. Resultado'}
                </span>
              </span>
            ))}
          </div>
          {step !== 'analyzing' && step !== 'importing' && (
            <button onClick={handleClose} style={{ padding: '4px 8px', borderRadius: 8, fontSize: 15, background: 'var(--surface-hover)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* STEP: config */}
          {step === 'config' && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(27,174,145,0.06)', border: '1px solid rgba(27,174,145,0.2)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Paso 1 — Descarga la plantilla</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                  Rellena tus {entidadPlural} en el Excel y vuelve a subir el archivo. La fila 1 son los encabezados, la fila 2 es un ejemplo — bórrala o reemplázala.
                </p>
                <button onClick={handleDescargar} disabled={descargando}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none', cursor: descargando ? 'not-allowed' : 'pointer', opacity: descargando ? 0.7 : 1 }}>
                  {descargando ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Descargando…</> : <><Download size={13} /> Descargar plantilla .xlsx</>}
                </button>
              </div>

              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Paso 2 — Sube tu archivo
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragging ? 'var(--color-primary)' : archivo ? 'rgba(27,174,145,0.5)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '24px 16px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
                    background: dragging ? 'rgba(27,174,145,0.06)' : archivo ? 'rgba(27,174,145,0.03)' : 'var(--surface-hover)',
                    transition: 'all 0.15s',
                  }}>
                  {archivo ? (
                    <><FileSpreadsheet size={28} style={{ color: 'var(--color-primary)' }} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{archivo.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{(archivo.size / 1024).toFixed(1)} KB — haz clic para cambiar</p>
                    </>
                  ) : (
                    <><Upload size={28} style={{ color: 'var(--text-secondary)' }} />
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Arrastra tu archivo aquí o haz clic para seleccionar</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>.xlsx o .csv — máximo 500 {entidadPlural}</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>

              {errorGlobal && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', fontSize: 13 }}>
                  {errorGlobal}
                </div>
              )}
            </div>
          )}

          {/* STEP: analyzing */}
          {step === 'analyzing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 20px' }}>
              <RefreshCw size={36} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Analizando archivo…</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Validando campos y buscando duplicados</p>
            </div>
          )}

          {/* STEP: preview */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
                <SummaryPill color="var(--color-success)" label={`${validos} válidos`} />
                {conErrores > 0 && <SummaryPill color="var(--color-error)" label={`${conErrores} con error`} />}
                {omitidos > 0 && <SummaryPill color="var(--color-warning)" label={`${omitidos} duplicados`} />}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>Haz clic en cualquier celda para editarla</span>
              </div>

              {errorGlobal && (
                <div style={{ margin: '8px 20px', padding: '10px 14px', borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', fontSize: 13, flexShrink: 0 }}>
                  {errorGlobal}
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={thHeader}>#</th>
                      <th style={thHeader}>Estado</th>
                      {columns.map(c => (
                        <th key={c.key} style={thHeader}>{c.label}{c.required ? ' *' : ''}</th>
                      ))}
                      <th style={thHeader}>Problema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewFilas.map((fila, rowIdx) => (
                      <PreviewRow key={fila.fila} fila={fila} rowIdx={rowIdx} columns={columns} onChange={updateFila} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modo de importación</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { v: 'parcial' as Modo, l: 'Parcial', d: 'Crea los válidos, omite los errores' },
                    { v: 'atomico' as Modo, l: 'Todo o nada', d: 'Cancela si hay algún error' },
                  ]).map(opt => (
                    <button key={opt.v} onClick={() => setModo(opt.v)}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        background: modo === opt.v ? 'rgba(27,174,145,0.08)' : 'var(--surface-hover)',
                        border: `1px solid ${modo === opt.v ? 'var(--color-primary)' : 'var(--border)'}`,
                      }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{opt.l}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{opt.d}</span>
                    </button>
                  ))}
                </div>
                {modo === 'atomico' && conErrores > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 6 }}>
                    Corrige los {conErrores} error{conErrores !== 1 ? 'es' : ''} para poder importar en modo "Todo o nada".
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP: importing */}
          {step === 'importing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 20px' }}>
              <RefreshCw size={36} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Importando {entidadPlural}…</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Creando registros</p>
            </div>
          )}

          {/* STEP: results */}
          {step === 'results' && resultado && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <SummaryCard icon={<CheckCircle size={18} />} value={resultado.creados}  label="Creados"  color="var(--color-success)" bg="var(--color-success-bg)" />
                <SummaryCard icon={<MinusCircle size={18} />} value={resultado.omitidos} label="Omitidos" color="var(--color-warning)" bg="var(--color-warning-bg)" />
                <SummaryCard icon={<AlertCircle size={18} />} value={resultado.errores}  label="Errores"  color="var(--color-error)"   bg="var(--color-error-bg)"   />
              </div>
              {resultado.filas.length > 0 && (
                <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                          {['Fila', entidadSingular.charAt(0).toUpperCase() + entidadSingular.slice(1), 'Estado', 'Mensaje'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '7px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)', position: 'sticky', top: 0, background: 'var(--surface-hover)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.filas.map(f => (
                          <tr key={f.fila} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '7px 12px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{f.fila}</td>
                            <td style={{ padding: '7px 12px', fontSize: 12, color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</td>
                            <td style={{ padding: '7px 12px' }}><ResultBadge estado={f.estado} /></td>
                            <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.mensaje ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {step === 'config' && (
            <>
              <button onClick={handleClose} style={btnSecondary}>Cancelar</button>
              <button onClick={handleAnalizar} disabled={!archivo} style={archivo ? btnPrimary : btnDisabled}>
                <ChevronRight size={13} /> Analizar archivo
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('config'); setErrorGlobal(null) }} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={13} /> Volver
              </button>
              <button onClick={handleImportar} disabled={!puedeImportar} style={puedeImportar ? btnPrimary : btnDisabled}>
                <Upload size={13} />
                {`Importar ${validos} ${validos !== 1 ? entidadPlural : entidadSingular}`}
              </button>
            </>
          )}
          {step === 'results' && (
            <>
              {resultado && resultado.errores > 0 && resultado.creados === 0 && (
                <button onClick={() => { setStep('preview'); setResultado(null) }} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowLeft size={13} /> Corregir
                </button>
              )}
              <button onClick={handleClose} style={resultado && resultado.creados > 0 ? btnPrimary : btnSecondary}>
                {resultado && resultado.creados > 0 ? 'Listo' : 'Cerrar'}
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

// ── PreviewRow ──────────────────────────────────────────────────────────────
interface PreviewRowProps {
  fila:     ImportFila
  rowIdx:   number
  columns:  ImportColumn[]
  onChange: (rowIdx: number, field: string, value: string) => void
}

function PreviewRow({ fila, rowIdx, columns, onChange }: PreviewRowProps) {
  const [focused, setFocused] = useState<string | null>(null)

  const rowBg =
    fila.estado === 'error'   ? 'rgba(239,68,68,0.04)'  :
    fila.estado === 'omitido' ? 'rgba(245,158,11,0.04)' :
    rowIdx % 2 === 0          ? 'transparent'            : 'var(--surface-hover)'

  function cellInput(c: ImportColumn) {
    const hasError  = fila.error_campo === c.key
    const isFocused = focused === c.key
    if (c.type === 'select' && c.options) {
      return (
        <select
          value={String(fila[c.key] ?? '')}
          onFocus={() => setFocused(c.key)} onBlur={() => setFocused(null)}
          onChange={e => onChange(rowIdx, c.key, e.target.value)}
          style={{
            width: '100%', background: hasError ? 'rgba(239,68,68,0.08)' : 'var(--surface)',
            border: `1px solid ${isFocused ? 'var(--color-primary)' : hasError ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
            borderRadius: 4, padding: '3px 4px', fontSize: 12, color: 'var(--text)', outline: 'none',
          }}>
          <option value="">—</option>
          {c.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    return (
      <input
        type={c.type === 'number' ? 'number' : 'text'}
        value={String(fila[c.key] ?? '')}
        onFocus={() => setFocused(c.key)} onBlur={() => setFocused(null)}
        onChange={e => onChange(rowIdx, c.key, e.target.value)}
        style={{
          width: '100%', background: hasError ? 'rgba(239,68,68,0.08)' : 'transparent',
          border: `1px solid ${isFocused ? 'var(--color-primary)' : hasError ? 'rgba(239,68,68,0.5)' : 'transparent'}`,
          borderRadius: 4, padding: '3px 6px', fontSize: 12, color: 'var(--text)', outline: 'none',
          boxSizing: 'border-box', minWidth: 0,
        }}
      />
    )
  }

  const estadoBadge =
    fila.estado === 'valido'  ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: 999 }}>Válido</span> :
    fila.estado === 'error'   ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-error)',   background: 'var(--color-error-bg)',   padding: '2px 6px', borderRadius: 999 }}>Error</span> :
    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-warning)', background: 'var(--color-warning-bg)', padding: '2px 6px', borderRadius: 999 }}>Omitido</span>

  return (
    <tr style={{ background: rowBg, borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '4px 10px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fila.fila}</td>
      <td style={{ padding: '4px 10px', whiteSpace: 'nowrap' }}>{estadoBadge}</td>
      {columns.map(c => (
        <td key={c.key} style={{ padding: '4px 6px', minWidth: c.width ?? 120 }}>{cellInput(c)}</td>
      ))}
      <td style={{ padding: '4px 10px', fontSize: 11, color: 'var(--color-error)', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {fila.estado === 'error' ? fila.mensaje : fila.estado === 'omitido' ? <span style={{ color: 'var(--color-warning)' }}>{fila.mensaje}</span> : null}
      </td>
    </tr>
  )
}

// ── Subcomponentes ──────────────────────────────────────────────────────────
function SummaryPill({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
    </div>
  )
}

function SummaryCard({ icon, value, label, color, bg }: { icon: React.ReactNode; value: number; label: string; color: string; bg: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', borderRadius: 10, border: '1px solid var(--border)', background: value > 0 ? bg : 'var(--surface-hover)' }}>
      <span style={{ color: value > 0 ? color : 'var(--text-secondary)' }}>{icon}</span>
      <span style={{ fontSize: 22, fontWeight: 800, color: value > 0 ? color : 'var(--text-secondary)' }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

function ResultBadge({ estado }: { estado: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    creado:  { label: 'Creado',  color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    omitido: { label: 'Omitido', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
    error:   { label: 'Error',   color: 'var(--color-error)',   bg: 'var(--color-error-bg)'   },
  }
  const c = cfg[estado] ?? { label: estado, color: 'var(--text-secondary)', bg: 'var(--surface-hover)' }
  return <span style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: c.bg, color: c.color }}>{c.label}</span>
}

// ── Estilos ─────────────────────────────────────────────────────────────────
const thHeader: React.CSSProperties = {
  textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.05em', color: 'var(--text-secondary)', whiteSpace: 'nowrap', background: 'var(--surface-hover)',
}
const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnPrimary:   React.CSSProperties = { ...btnBase, background: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none' }
const btnSecondary: React.CSSProperties = { ...btnBase, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
const btnDisabled:  React.CSSProperties = { ...btnBase, background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', cursor: 'not-allowed' }
