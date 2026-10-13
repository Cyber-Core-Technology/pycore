import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, GitMerge, Loader2, Search, X } from 'lucide-react'
import { inventoryApi } from '@/api/inventory-api'
import { mediaUrl } from '@/api/axios-config'
import { formatMXN } from '@/utils/formatters'
import type { CampoFusion, FichaFusion, ResultadoFusion } from '@/types/inventory.types'

interface Props {
  /** El producto desde cuya ficha se abrió. */
  productoId:     string
  productoNombre: string
  onClose:        () => void
  /** Ya se fusionó. `retirado` dice si el producto de esta ficha fue el que salió. */
  onFusionado:    (resultado: ResultadoFusion, retirado: boolean) => void
}

/**
 * Fusionar este producto con otro, a mano.
 *
 * La fusión masiva sólo se atreve con lo indudable; lo demás —dos nombres que
 * no se parecen, dos códigos distintos— lo tiene que decidir alguien que
 * conoce la mercancía. Aquí se ven las dos fichas lado a lado, se elige cuál
 * queda y, dato por dato, de cuál se toma el valor.
 *
 * Ninguna de las dos cosas se decide sola: la más usada viene sugerida, pero
 * quien confirma es la persona. El producto que sale no se borra de la
 * historia —sus ventas y su kardex se quedan con él—; lo que viaja es la
 * existencia y las sucursales donde se manejaba.
 */
export function FusionarProductoModal({ productoId, productoNombre, onClose, onFusionado }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [texto,     setTexto]     = useState('')
  const [busqueda,  setBusqueda]  = useState('')
  const [otroId,    setOtroId]    = useState<string | null>(null)
  const [conservar, setConservar] = useState<string | null>(null)
  const [elegidos,  setElegidos]  = useState<Partial<Record<CampoFusion, string>>>({})
  const [enviando,  setEnviando]  = useState(false)
  const [motivos,   setMotivos]   = useState<string[]>([])

  // Buscar mientras se escribe, sin pedir en cada tecla.
  useEffect(() => {
    const id = setTimeout(() => setBusqueda(texto.trim()), 300)
    return () => clearTimeout(id)
  }, [texto])

  const candidatos = useQuery({
    queryKey: ['fusion-candidatos', busqueda],
    queryFn:  () => inventoryApi.listarProductos({ q: busqueda, page_size: 20 }),
    enabled:  !otroId && busqueda.length >= 2,
  })

  const comparacion = useQuery({
    queryKey: ['fusion-comparar', productoId, otroId],
    queryFn:  () => inventoryApi.compararFusion(productoId, otroId as string),
    enabled:  !!otroId,
    // Lo que se compara es existencia y uso de este instante: nunca de caché.
    gcTime: 0, staleTime: 0,
  })

  // Lo sugerido entra como punto de partida; de ahí en adelante manda la persona.
  useEffect(() => {
    if (!comparacion.data) return
    setConservar(comparacion.data.sugerido_conservar)
    setElegidos(comparacion.data.sugeridos)
    setMotivos([])
  }, [comparacion.data])

  const elegirOtro = (id: string | null) => {
    setOtroId(id); setConservar(null); setElegidos({}); setMotivos([])
  }

  const datos    = comparacion.data
  const [a, b]   = datos?.productos ?? []
  const queda    = datos?.productos.find((p) => p.id === conservar)
  const sale     = datos?.productos.find((p) => p.id !== conservar)
  const bloqueos = (conservar && datos?.bloqueos[conservar]) || []

  const confirmar = async () => {
    if (!datos || !queda || !sale || bloqueos.length) return
    setEnviando(true)
    setMotivos([])
    try {
      const r = await inventoryApi.fusionarProducto(productoId, {
        otro: otroId as string, conservar: queda.id, campos: elegidos,
      })
      qc.invalidateQueries({ queryKey: ['productos'] })
      qc.invalidateQueries({ queryKey: ['producto'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['producto-movimientos'] })
      toast.success(t('inventory.fusion.hecho', {
        defaultValue: '{{retirado}} se fusionó en {{conservado}}',
        retirado: r.retirado, conservado: r.conservado,
      }))
      onFusionado(r, sale.id === productoId)
    } catch (e: any) {
      const data = e?.response?.data
      setMotivos(
        Array.isArray(data?.motivos) && data.motivos.length
          ? data.motivos
          : [data?.detail || t('inventory.fusion.error', { defaultValue: 'No se pudo fusionar. Intenta de nuevo.' })],
      )
      setEnviando(false)
    }
  }

  return createPortal(
    <>
      <div onClick={enviando ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10002 }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(680px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 32px)', zIndex: 10003,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexShrink: 0, padding: 7, borderRadius: 9, background: 'rgba(27,174,145,0.12)', color: 'var(--color-primary)' }}>
            <GitMerge size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {t('inventory.fusion.titulo', { defaultValue: 'Fusionar con otro producto' })}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {productoNombre}
            </p>
          </div>
          <button onClick={onClose} disabled={enviando} style={{ padding: 5, borderRadius: 6, background: 'var(--surface-hover)', border: 'none', cursor: enviando ? 'default' : 'pointer', display: 'flex', color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {!otroId && (
            <>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {t('inventory.fusion.ayudaBuscar', {
                  defaultValue: 'Busca la otra ficha del mismo artículo. Verás las dos lado a lado antes de que cambie nada.',
                })}
              </p>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  autoFocus
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={t('inventory.fusion.buscar', { defaultValue: 'Nombre, código o código de barras' })}
                  style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: 9, fontSize: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {candidatos.isFetching && <Cargando />}
              {candidatos.isError && (
                <Aviso tono="error" lineas={[t('inventory.fusion.errorBuscar', { defaultValue: 'No se pudo buscar. Revisa tu conexión.' })]} />
              )}
              {candidatos.data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {candidatos.data.filter((p) => p.id !== productoId).map((p) => (
                    <button key={p.id} type="button" onClick={() => elegirOtro(p.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '9px 12px',
                      borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{p.sku || p.codigo}</p>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{formatMXN(Number(p.precio_venta))}</span>
                    </button>
                  ))}
                  {!candidatos.isFetching && candidatos.data.filter((p) => p.id !== productoId).length === 0 && (
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {t('inventory.fusion.sinResultados', { defaultValue: 'Ningún otro producto coincide.' })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {otroId && comparacion.isLoading && <Cargando />}
          {otroId && comparacion.isError && (
            <Aviso tono="error" lineas={[t('inventory.fusion.errorComparar', { defaultValue: 'No se pudieron comparar los productos.' })]} />
          )}

          {otroId && datos && a && b && (
            <>
              <button type="button" onClick={() => elegirOtro(null)} disabled={enviando} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'transparent', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ArrowLeft size={13} /> {t('inventory.fusion.elegirOtro', { defaultValue: 'Elegir otro producto' })}
              </button>

              {/* 1. Cuál queda */}
              <Titulo>{t('inventory.fusion.cualQueda', { defaultValue: '1. ¿Cuál ficha se conserva?' })}</Titulo>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[a, b].map((p) => (
                  <FichaCard
                    key={p.id} ficha={p} marcada={conservar === p.id}
                    sugerida={datos.sugerido_conservar === p.id}
                    onClick={() => { setConservar(p.id); setMotivos([]) }}
                  />
                ))}
              </div>

              {/* 2. De cuál se toma cada dato */}
              <Titulo>{t('inventory.fusion.queValores', { defaultValue: '2. ¿Qué valor se queda en cada dato?' })}</Titulo>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {datos.campos.map((campo, i) => {
                  const va = valorDe(a, campo), vb = valorDe(b, campo)
                  const iguales = va.clave === vb.clave
                  return (
                    <div key={campo} style={{ display: 'grid', gridTemplateColumns: '108px 1fr 1fr', alignItems: 'stretch', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ padding: '9px 10px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}>
                        {t(`inventory.fusion.campos.${campo}`, { defaultValue: ETIQUETAS[campo] })}
                      </div>
                      {iguales ? (
                        <div style={{ gridColumn: 'span 2', padding: '9px 10px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                          {va.nodo} <span style={{ fontSize: 11 }}>· {t('inventory.fusion.igual', { defaultValue: 'igual en las dos' })}</span>
                        </div>
                      ) : (
                        [[a, va] as const, [b, vb] as const].map(([p, v]) => (
                          <Celda
                            key={p.id} marcada={elegidos[campo] === p.id}
                            onClick={() => setElegidos((prev) => ({ ...prev, [campo]: p.id }))}
                          >
                            {v.nodo}
                          </Celda>
                        ))
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 3. Qué va a pasar */}
              {queda && sale && (
                <div style={{ padding: '11px 13px', borderRadius: 10, background: 'var(--surface-hover)', fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>
                  <p style={{ margin: 0 }}>
                    {t('inventory.fusion.resumenQueda', {
                      defaultValue: 'Queda {{codigo}} y se retira {{otro}} del catálogo.',
                      codigo: queda.codigo, otro: sale.codigo,
                    })}
                  </p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                    {sale.existencia.length
                      ? t('inventory.fusion.resumenExistencia', {
                          defaultValue: 'Su existencia ({{detalle}}) pasa a la ficha que queda, con un movimiento de salida y otro de entrada a tu nombre.',
                          detalle: sale.existencia.map((e) => `${Number(e.cantidad)} en ${e.sucursal}`).join(', '),
                        })
                      : t('inventory.fusion.resumenSinExistencia', {
                          defaultValue: 'No tiene existencia que traspasar, así que no se genera ningún movimiento.',
                        })}
                    {' '}
                    {t('inventory.fusion.resumenHistoria', {
                      defaultValue: 'Sus ventas y su historial de movimientos se conservan con la ficha retirada. La fusión queda registrada en Auditoría.',
                    })}
                  </p>
                </div>
              )}

              {datos.avisos.length > 0 && <Aviso tono="aviso" lineas={datos.avisos} />}
              {bloqueos.length > 0 && (
                <Aviso
                  tono="error"
                  titulo={t('inventory.fusion.bloqueada', { defaultValue: 'No se puede fusionar conservando esta ficha:' })}
                  lineas={bloqueos}
                />
              )}
              {motivos.length > 0 && <Aviso tono="error" lineas={motivos} />}
            </>
          )}
        </div>

        {otroId && datos && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={onClose} disabled={enviando} style={{ flex: 1, padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: enviando ? 'default' : 'pointer' }}>
              {t('common.cancel', { defaultValue: 'Cancelar' })}
            </button>
            <button
              onClick={confirmar}
              disabled={enviando || !queda || bloqueos.length > 0}
              style={{
                flex: 2, padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700, border: 'none',
                color: 'var(--color-primary-text)', background: 'var(--color-primary)',
                cursor: enviando || !queda || bloqueos.length ? 'default' : 'pointer',
                opacity: enviando || !queda || bloqueos.length ? 0.55 : 1,
              }}
            >
              {enviando
                ? t('inventory.fusion.fusionando', { defaultValue: 'Fusionando…' })
                : t('inventory.fusion.confirmar', { defaultValue: 'Fusionar productos' })}
            </button>
          </div>
        )}
      </div>
    </>,
    document.body,
  )
}

const ETIQUETAS: Record<CampoFusion, string> = {
  nombre:         'Nombre',
  codigo_barras:  'Código de barras',
  precio_venta:   'Precio de venta',
  precio_mayoreo: 'Precio mayoreo',
  precio_compra:  'Costo',
  categoria_id:   'Categoría',
  impuesto_id:    'Impuesto',
  imagen_url:     'Imagen',
  descripcion:    'Descripción',
}

/** Cómo se enseña el valor de un campo, y con qué se compara contra el del otro. */
function valorDe(p: FichaFusion, campo: CampoFusion): { clave: string; nodo: React.ReactNode } {
  const vacio = <span style={{ color: 'var(--text-secondary)' }}>—</span>
  switch (campo) {
    case 'precio_venta':
    case 'precio_mayoreo':
    case 'precio_compra': {
      const n = Number(p[campo] ?? 0)
      return { clave: String(n), nodo: n ? formatMXN(n) : vacio }
    }
    case 'categoria_id':
      return { clave: p.categoria_id ?? '', nodo: p.categoria_nombre || vacio }
    case 'impuesto_id':
      return { clave: p.impuesto_id ?? '', nodo: p.impuesto_nombre || vacio }
    case 'imagen_url':
      return {
        clave: p.imagen_url,
        nodo: p.imagen_url
          ? <img src={mediaUrl(p.imagen_url)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
          : vacio,
      }
    default:
      return { clave: p[campo] ?? '', nodo: p[campo] || vacio }
  }
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '2px 0 0', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{children}</p>
}

function Cargando() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 14, color: 'var(--text-secondary)' }}>
      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )
}

function Aviso({ tono, titulo, lineas }: { tono: 'aviso' | 'error'; titulo?: string; lineas: string[] }) {
  const error = tono === 'error'
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 9,
      background: error ? 'var(--color-error-bg)' : 'rgba(245,158,11,0.10)',
      border: `1px solid ${error ? 'var(--color-error)' : 'rgba(245,158,11,0.35)'}`,
    }}>
      <AlertTriangle size={14} style={{ color: error ? 'var(--color-error)' : 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
        {titulo && <p style={{ margin: 0, fontWeight: 600 }}>{titulo}</p>}
        {lineas.map((l) => <p key={l} style={{ margin: 0 }}>{l}</p>)}
      </div>
    </div>
  )
}

function Radio({ marcada }: { marcada: boolean }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16,
      borderRadius: '50%', flexShrink: 0, marginTop: 1,
      border: `1.5px solid ${marcada ? 'var(--color-primary)' : 'var(--border)'}`,
    }}>
      {marcada && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
    </span>
  )
}

function Celda({ marcada, onClick, children }: { marcada: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left', padding: '9px 10px',
      border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', minWidth: 0,
      background: marcada ? 'rgba(27,174,145,0.10)' : 'transparent',
      fontSize: 12.5, color: 'var(--text)', wordBreak: 'break-word',
    }}>
      <Radio marcada={marcada} />
      <span style={{ minWidth: 0 }}>{children}</span>
    </button>
  )
}

function FichaCard({ ficha, marcada, sugerida, onClick }: {
  ficha: FichaFusion; marcada: boolean; sugerida: boolean; onClick: () => void
}) {
  const { t } = useTranslation()
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 9, textAlign: 'left', padding: '11px 12px',
      borderRadius: 10, cursor: 'pointer', minWidth: 0,
      border: `1px solid ${marcada ? 'var(--color-primary)' : 'var(--border)'}`,
      background: marcada ? 'rgba(27,174,145,0.08)' : 'transparent',
    }}>
      <Radio marcada={marcada} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11.5, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
          {ficha.codigo}
          {sugerida && (
            <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 999, fontFamily: 'inherit', fontSize: 10.5, fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(27,174,145,0.14)' }}>
              {t('inventory.fusion.masUsada', { defaultValue: 'la más usada' })}
            </span>
          )}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>{ficha.nombre}</p>
        <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {t('inventory.fusion.uso', {
            defaultValue: '{{ventas}} ventas · {{compras}} compras · {{movimientos}} movimientos',
            ventas: ficha.ventas, compras: ficha.compras, movimientos: ficha.movimientos,
          })}
          <br />
          {ficha.existencia.length
            ? ficha.existencia.map((e) => `${Number(e.cantidad)} en ${e.sucursal}`).join(' · ')
            : t('inventory.fusion.sinExistencia', { defaultValue: 'Sin existencia' })}
        </p>
      </div>
    </button>
  )
}
