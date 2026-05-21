import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Megaphone, Send, CheckCircle, Users, Tag,
  Eye, AlertCircle, Smile,
} from 'lucide-react'
import { notificacionesApi }     from '@/api/notificaciones-api'
import { useAuthStore }           from '@/store/authStore'
import { BackToConfig }           from '../components/BackToConfig'
import { PushPermissionBanner }   from '@/components/common/PushPermissionBanner'

// ─── Emoji Picker ────────────────────────────────────────────
const EMOJI_CATS: { label: string; emojis: string[] }[] = [
  { label: '😀 Caras', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
  { label: '👋 Gestos', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','🫦'] },
  { label: '❤️ Símbolos', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🕉️','🔱','📛','🔰','♻️','✅','❎','🆗','🆙','🆒','🆕','🆓','🔝','🆘','⛔','🚫','❌','‼️','⁉️','❓','❔','❕','❗','💯','🔅','🔆','🔱','⚜️','🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️'] },
  { label: '🎉 Celebración', emojis: ['🎉','🎊','🎈','🎁','🎀','🎗️','🎟️','🎫','🎖️','🏆','🥇','🥈','🥉','⭐','🌟','💫','✨','🌠','🎆','🎇','🧨','🎑','🎃','🎄','🎋','🎍','🎎','🎐','🎏','🎠','🎡','🎢','💝','🎰','🧧'] },
  { label: '💼 Trabajo', emojis: ['📊','📈','📉','📋','📌','📍','🗂️','📁','📂','📅','📆','📇','📒','📓','📔','📕','📗','📘','📙','📚','📖','🔖','🏷️','💰','💴','💵','💶','💷','💸','💳','🧾','💹','✉️','📧','📨','📩','📤','📥','📦','📫','📪','📬','📭','📮','🗳️','✏️','✒️','🖊️','🖋️','📝','💼','📁','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🛡️','⚙️','🗜️','⚖️','🦯','🔗','⛓️','🪝','🧲','🔧','🔩','🪛','🔫','💡','🔦','🕯️','🪔','🧯','🛢️','💊','🩺','🩻'] },
  { label: '🌈 Naturaleza', emojis: ['🌸','🌺','🌻','🌹','🌷','🌼','💐','🍀','🌿','🌱','🌲','🌳','🌴','🌵','🌾','🍁','🍂','🍃','🍄','🐚','🪨','🪵','🌊','🌬️','🌀','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','💧','💦','🌫️','🌡️','☂️','☔','⚡','🔥','🌙','⭐','🌟','💫','✨','⚡','🌈'] },
  { label: '📢 Avisos', emojis: ['📢','📣','🔔','🔕','🔈','🔇','🔊','📯','🔔','🔒','🚨','⚠️','🚧','🛑','⛔','📵','🚭','🚯','🚱','🚳','🔞','🔇','🔕','❌','✅','☑️','♻️','⚡','🆘','ℹ️','🔔','📌','📍','🗺️','🧭','💬','💭','🗨️','🗯️'] },
]

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState(0)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div
      ref={pickerRef}
      onMouseDown={(e) => e.preventDefault()}  // ← impide que el picker robe el foco del textarea
      style={{
        position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
        width: 320, borderRadius: 14,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        zIndex: 200, overflow: 'hidden',
      }}
    >
      {/* Tabs de categorías */}
      <div style={{
        display: 'flex', overflowX: 'auto', gap: 2, padding: '8px 8px 0',
        borderBottom: '1px solid var(--border)',
      }}>
        {EMOJI_CATS.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCat(i)}
            title={c.label}
            style={{
              padding: '4px 8px', borderRadius: '8px 8px 0 0', border: 'none',
              background: cat === i ? 'var(--surface-hover)' : 'transparent',
              fontSize: 16, cursor: 'pointer', flexShrink: 0,
              borderBottom: cat === i ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}
          >
            {c.emojis[0]}
          </button>
        ))}
      </div>

      {/* Grid de emojis */}
      <div style={{ padding: 8, maxHeight: 200, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {EMOJI_CATS[cat].emojis.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => onSelect(em)}
              style={{
                width: 36, height: 36, fontSize: 20, border: 'none',
                background: 'transparent', cursor: 'pointer', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {em}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const ROLE_SLUGS = ['', 'vendedor', 'almacenista', 'contador', 'rrhh', 'gerente'] as const
const ROLE_ICONS: Record<string, string> = {
  '': '👥', vendedor: '🛒', almacenista: '📦', contador: '💼', rrhh: '🤝', gerente: '⭐',
}
const TAG_KEYS = ['{usuario}', '{empresa}', '{fecha}', '{hora}', '{remitente}'] as const

// Highlight de tags en el texto
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\{[a-z]+\})/g)
  return (
    <span>
      {parts.map((part, i) =>
        /^\{[a-z]+\}$/.test(part) ? (
          <mark key={i} style={{ background: 'rgba(24,174,145,0.2)', color: 'var(--color-primary)', borderRadius: 4, padding: '0 2px', fontWeight: 600 }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

export function NotificacionesAdminPage() {
  const { t }    = useTranslation()
  const usuario  = useAuthStore((s) => s.usuario)
  const textRef  = useRef<HTMLTextAreaElement>(null)

  const [titulo,      setTitulo]      = useState('')
  const [mensaje,     setMensaje]     = useState('')
  const [rolSlug,     setRolSlug]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [result,      setResult]      = useState<{ enviadas: number } | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [showEmojis,  setShowEmojis]  = useState(false)

  const ROLES = ROLE_SLUGS.map((slug) => ({
    slug,
    icon:  ROLE_ICONS[slug],
    label: t(`config.notifications.roles.${slug || 'all'}.label`),
    desc:  t(`config.notifications.roles.${slug || 'all'}.desc`),
  }))

  const TAGS = TAG_KEYS.map((tag) => {
    const key = tag.replace(/[{}]/g, '') as 'usuario' | 'empresa' | 'fecha' | 'hora' | 'remitente'
    return {
      tag,
      label: t(`config.notifications.tags.${key}`),
      ejemplo: key === 'fecha'
        ? new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
        : key === 'hora'
        ? new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : key === 'usuario'   ? 'Juan Pérez'
        : key === 'empresa'   ? (usuario?.empresa?.nombre ?? 'Demo')
        : (usuario?.nombre_completo ?? 'Admin'),
    }
  })

  const resolverVariables = (texto: string): string => {
    const empresa = usuario?.empresa?.nombre ?? 'la empresa'
    const fecha   = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    const hora    = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    return texto
      .replace(/\{usuario\}/g,   t('config.notifications.recipientPlaceholder'))
      .replace(/\{empresa\}/g,   empresa)
      .replace(/\{fecha\}/g,     fecha)
      .replace(/\{hora\}/g,      hora)
      .replace(/\{remitente\}/g, usuario?.nombre_completo ?? 'Admin')
  }

  const rolActual = ROLES.find((r) => r.slug === rolSlug) ?? ROLES[0]
  const canSend   = titulo.trim().length > 0 && mensaje.trim().length > 0 && !sending

  // Inserta texto en la posición actual del cursor del textarea
  // (el textarea nunca pierde el foco gracias a onMouseDown preventDefault)
  const insertarEnCursor = (texto: string) => {
    const ta = textRef.current
    if (!ta) { setMensaje((m) => m + texto); return }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const nuevo = mensaje.slice(0, start) + texto + mensaje.slice(end)
    const newPos = start + texto.length
    setMensaje(nuevo)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setResult(null)
    setError(null)
    try {
      const res = await notificacionesApi.broadcast({ titulo, mensaje, rol_slug: rolSlug })
      setResult(res)
      setTitulo('')
      setMensaje('')
    } catch {
      setError(t('config.notifications.sendError'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <BackToConfig />
      <div style={{ maxWidth: 640, padding: '16px 0 0' }}>
        <PushPermissionBanner />
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))',
            border: '1px solid rgba(96,165,250,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#60A5FA', flexShrink: 0,
          }}
        >
          <Megaphone size={22} />
        </div>
        <div>
          <h2 className="font-semibold" style={{ fontSize: 16, color: 'var(--text)' }}>
            {t('config.notifications.sendToUsers')}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('config.notifications.subtitle')}
          </p>
        </div>
      </div>

      {/* Layout 2 columnas */}
      <div className="layout-sidebar-right">

        {/* ── Columna izquierda: formulario ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Destinatarios */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t('config.notifications.recipients')}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ROLES.map((r) => {
                const active = rolSlug === r.slug
                return (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => setRolSlug(r.slug)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 20,
                      border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border)'}`,
                      background: active ? 'rgba(24,174,145,0.12)' : 'var(--surface-hover)',
                      color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <span>{r.icon}</span>
                    {r.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-disabled)' }}>{rolActual.desc}</p>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Título */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t('config.notifications.titleField')}</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={t('config.notifications.titlePlaceholder')}
              maxLength={160}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                outline: 'none', background: 'var(--surface-hover)',
                border: '1px solid var(--border)', color: 'var(--text)',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 11, color: titulo.length > 130 ? 'var(--color-warning)' : 'var(--text-disabled)' }}>
                {titulo.length}/160
              </span>
            </div>
          </div>

          {/* Mensaje */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t('config.notifications.messageField')}</label>
            <textarea
              ref={textRef}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder={t('config.notifications.messagePlaceholder')}
              rows={6}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                outline: 'none', background: 'var(--surface-hover)',
                border: '1px solid var(--border)', color: 'var(--text)',
                resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowEmojis((s) => !s)}
                  title={t('config.notifications.insertEmoji')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${showEmojis ? 'var(--color-primary)' : 'var(--border)'}`,
                    background: showEmojis ? 'rgba(24,174,145,0.1)' : 'transparent',
                    color: showEmojis ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <Smile size={14} />
                  Emoji
                </button>
                {showEmojis && (
                  <EmojiPicker
                    onSelect={(em) => { insertarEnCursor(em); setShowEmojis(false) }}
                    onClose={() => setShowEmojis(false)}
                  />
                )}
              </div>
              <span style={{ fontSize: 11, color: mensaje.length > 400 ? 'var(--color-warning)' : 'var(--text-disabled)' }}>
                {mensaje.length} chars
              </span>
            </div>
          </div>

          {/* Error / Éxito */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
              <AlertCircle size={15} />
              <p style={{ fontSize: 13 }}>{error}</p>
            </div>
          )}
          {result && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ADE80' }}>
              <CheckCircle size={18} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>
                  {result.enviadas === 0
                    ? t('config.notifications.noUsersFilter')
                    : result.enviadas !== 1
                      ? t('config.notifications.sentCountPlural', { count: result.enviadas })
                      : t('config.notifications.sentCount', { count: result.enviadas })}
                </p>
                <p style={{ fontSize: 11, opacity: 0.7 }}>{t('config.notifications.sentRealtime')}</p>
              </div>
            </div>
          )}

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={!canSend}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: canSend ? 'var(--color-primary)' : 'rgba(24,174,145,0.3)',
              color: 'var(--color-primary-text)',
              cursor: canSend ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s', border: 'none',
            }}
          >
            <Send size={15} />
            {sending ? t('config.notifications.sending') : t('config.notifications.sendTo', { role: rolActual.label.toLowerCase() })}
          </button>

        </form>

        {/* ── Columna derecha: preview + variables ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Preview en vivo */}
          <div style={{ borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Eye size={13} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('config.notifications.preview')}</span>
            </div>
            <div style={{ padding: 16, background: 'var(--surface)' }}>
              {/* Notificación simulada */}
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(24,174,145,0.06)', border: '1px solid rgba(24,174,145,0.2)',
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {titulo || <span style={{ color: 'var(--text-disabled)' }}>{t('config.notifications.previewTitlePlaceholder')}</span>}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {mensaje
                    ? <HighlightedText text={resolverVariables(mensaje)} />
                    : <span style={{ color: 'var(--text-disabled)' }}>{t('config.notifications.previewContentPlaceholder')}</span>}
                </p>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 10, textAlign: 'right' }}>
                {t('config.notifications.previewFor', { label: rolActual.label, desc: rolActual.desc })}
              </p>
            </div>
          </div>

          {/* Variables dinámicas */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Tag size={13} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t('config.notifications.dynamicVars')}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {TAGS.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => insertarEnCursor(t.tag)}
                  title={`${t.label} → "${t.ejemplo}"`}
                  style={{
                    padding: '3px 9px', borderRadius: 6,
                    border: '1px solid rgba(24,174,145,0.3)',
                    background: 'rgba(24,174,145,0.08)',
                    color: 'var(--color-primary)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(24,174,145,0.18)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(24,174,145,0.08)' }}
                >
                  {t.tag}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {TAGS.map((t) => (
                <div key={t.tag} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <code style={{ fontSize: 10, color: 'var(--color-primary)', minWidth: 86, fontFamily: 'JetBrains Mono, monospace' }}>
                    {t.tag}
                  </code>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
