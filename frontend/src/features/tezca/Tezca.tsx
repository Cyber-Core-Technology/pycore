import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, RefreshCw, MessageSquare, Award } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  useTezcaInsights, useTezcaStatus,
  useTezcaConversaciones, useMarcarLeido, useTezcaConsultar,
} from '@/hooks/useTezca'
import { useQuery } from '@tanstack/react-query'
import { insigniasApi, type InsigniaTezca } from '@/api/notificaciones-api'
import TezcaLogo from '@/assets/tezca-logo.svg'
import type { TezcaInsight } from '@/api/tezca-api'

// ─── Colores por tipo ──────────────────────────────────────
const TIPO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  urgente:  { bg: 'var(--color-error-bg)',   color: '#F87171', border: 'rgba(239,68,68,0.25)'   },
  alerta:   { bg: 'rgba(245,158,11,0.08)',  color: '#FBBF24', border: 'rgba(245,158,11,0.25)'  },
  positivo: { bg: 'rgba(34,197,94,0.08)',   color: '#4ADE80', border: 'rgba(34,197,94,0.25)'   },
  info:     { bg: 'rgba(96,165,250,0.08)',  color: '#93C5FD', border: 'rgba(96,165,250,0.25)'  },
}

// ─── Insight Card ──────────────────────────────────────────
function InsightCard({ insight, onLeer }: { insight: TezcaInsight; onLeer: (id: number) => void }) {
  const { t } = useTranslation()
  const style = TIPO_STYLE[insight.tipo] ?? TIPO_STYLE.info

  return (
    <div
      className="p-3 rounded-xl card-enter transition-all"
      style={{
        background:   style.bg,
        border:       `1px solid ${style.border}`,
        opacity:      insight.leido ? 0.55 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{insight.icono}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug" style={{ color: style.color }}>
              {insight.titulo}
            </p>
            {!insight.leido && (
              <button
                onClick={() => onLeer(insight.id)}
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 transition-colors"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
              >
                {t('tezca.readBtn')}
              </button>
            )}
          </div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {insight.mensaje}
          </p>
          {insight.accion_sugerida && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: style.color }}>
              💡 {insight.accion_sugerida}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Chat Bubble ───────────────────────────────────────────
function ChatBubble({ role, text }: { role: 'user' | 'tezca'; text: string }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full text-sm flex-shrink-0"
        style={{
          background: isUser ? 'var(--color-primary)' : 'rgba(96,165,250,0.15)',
          color:      isUser ? 'var(--color-primary-text)'              : '#93C5FD',
        }}
      >
        {isUser ? '👤' : <img src={TezcaLogo} alt="T" style={{ width: 20, height: 20 }} />}
      </div>
      <div
        className="max-w-[80%] px-3 py-2 rounded-xl text-base leading-relaxed"
        style={{
          background: isUser ? 'var(--color-primary)' : 'var(--surface-hover)',
          color:      isUser ? 'var(--color-primary-text)'              : 'var(--text)',
        }}
      >
        {text}
      </div>
    </div>
  )
}

// ─── Insignia Card ─────────────────────────────────────────
function InsigniaCard({ insignia }: { insignia: InsigniaTezca }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center transition-all"
      style={{
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.2)',
      }}
    >
      <span style={{ fontSize: 32 }}>{insignia.icono}</span>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>{insignia.titulo}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{insignia.descripcion}</p>
      <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
        {new Date(insignia.obtenida_en).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}

// ─── Tabs ──────────────────────────────────────────────────
type Tab = 'insights' | 'chat' | 'insignias'

// ─── Main ──────────────────────────────────────────────────
export function Tezca() {
  const { t } = useTranslation()
  const [tab, setTab]       = useState<Tab>('insights')
  const [input, setInput]   = useState('')
  const [mensajes, setMensajes] = useState<Array<{ role: 'user' | 'tezca'; text: string }>>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: insights, isLoading: iLoading, refetch } = useTezcaInsights()
  const { data: status }   = useTezcaStatus()
  const { data: historial } = useTezcaConversaciones()
  const { mutate: marcarLeido } = useMarcarLeido()
  const { mutate: consultar, isPending: enviando } = useTezcaConsultar()
  const { data: insignias = [] } = useQuery({ queryKey: ['tezca-insignias'], queryFn: insigniasApi.listar })

  // Cargar historial de conversaciones al abrir el chat
  useEffect(() => {
    if (tab === 'chat' && historial && mensajes.length === 0) {
      const cargados = historial.slice(0, 10).reverse().flatMap((c: any) => [
        { role: 'user'  as const, text: c.pregunta  },
        { role: 'tezca' as const, text: c.respuesta },
      ])
      if (cargados.length > 0) setMensajes(cargados)
    }
  }, [tab, historial])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviar = () => {
    const pregunta = input.trim()
    if (!pregunta || enviando) return

    setMensajes((prev) => [...prev, { role: 'user', text: pregunta }])
    setInput('')

    consultar(pregunta, {
      onSuccess: (data) => {
        setMensajes((prev) => [...prev, { role: 'tezca', text: data.respuesta }])
      },
      onError: () => {
        setMensajes((prev) => [
          ...prev,
          { role: 'tezca', text: t('tezca.errorChat') },
        ])
      },
    })
  }

  const noLeidos = (insights ?? []).filter((i) => !i.leido).length

  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <img src={TezcaLogo} alt="TEZCA" style={{ width: 28, height: 28 }} /> TEZCA
            </h1>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('tezca.tagline')}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg transition-colors flex-shrink-0"
            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {status && (
          <span className="text-xs px-3 py-1.5 rounded-full w-fit" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {t('tezca.consultasRestantes', { count: status.peticiones_restantes })}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {([
          { key: 'insights',  label: t('tezca.tabInsights'),  icon: Sparkles,      badge: noLeidos,         extra: ''                        },
          { key: 'chat',      label: t('tezca.tabChat'),      icon: MessageSquare, badge: 0,                extra: ''                        },
          { key: 'insignias', label: t('tezca.tabInsignias'), icon: Award,         badge: insignias.length, extra: 'col-span-2 sm:col-span-1' },
        ] as const).map(({ key, label, icon: Icon, badge: b, extra }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${extra}`}
            style={{
              background: tab === key ? 'var(--color-primary)' : 'var(--surface-hover)',
              color:      tab === key ? 'var(--color-primary-text)' : 'var(--text-secondary)',
            }}
          >
            <Icon size={13} />
            {label}
            {b > 0 && (
              <span
                className="flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold"
                style={{ background: tab === key ? 'rgba(0,0,0,0.2)' : 'var(--color-error)', color: '#fff' }}
              >
                {b}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: INSIGHTS ─────────────────────────────────── */}
      {tab === 'insights' && (
        <div className="flex flex-col gap-3">
          {iLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
            ))
          ) : !insights || insights.length === 0 ? (
            <div className="card p-10 flex flex-col items-center gap-3">
              <span className="text-4xl">✨</span>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t('tezca.noInsights')}</p>
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                {t('tezca.noInsightsHint')}
              </p>
            </div>
          ) : (
            <>
              {noLeidos > 0 && (
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('tezca.unreadCount', { unread: noLeidos, total: insights.length })}
                </p>
              )}
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onLeer={(id) => marcarLeido(id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── TAB: CHAT ─────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="card flex flex-col" style={{ height: '60vh', minHeight: '400px' }}>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {mensajes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <img src={TezcaLogo} alt="TEZCA" style={{ width: 56, height: 56, opacity: 0.7 }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('tezca.askTezca')}
                </p>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  {[
                    t('tezca.suggestion1'),
                    t('tezca.suggestion2'),
                    t('tezca.suggestion3'),
                  ].map((sugerencia) => (
                    <button
                      key={sugerencia}
                      onClick={() => setInput(sugerencia)}
                      className="text-xs px-3 py-2 rounded-lg text-left transition-colors"
                      style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
                    >
                      {sugerencia}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mensajes.map((m, i) => (
                <ChatBubble key={i} role={m.role} text={m.text} />
              ))
            )}
            {enviando && (
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'rgba(96,165,250,0.15)', color: '#93C5FD' }}>
                  🪞
                </div>
                <div className="flex gap-1 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-hover)' }}>
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--text-secondary)', animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
            {status?.peticiones_restantes === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: '#F87171' }}>
                {t('tezca.limitReached')}
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar()}
                  placeholder={t('tezca.inputPlaceholder')}
                  disabled={enviando}
                  className="flex-1 px-3 py-2 rounded-lg text-base outline-none transition-colors"
                  style={{
                    background:  'var(--surface-hover)',
                    color:       'var(--text)',
                    border:      '1px solid var(--border)',
                  }}
                />
                <button
                  onClick={enviar}
                  disabled={!input.trim() || enviando}
                  className="flex items-center justify-center w-9 h-9 rounded-lg transition-all flex-shrink-0"
                  style={{
                    background: input.trim() && !enviando ? 'var(--color-primary)' : 'var(--surface-hover)',
                    color:      input.trim() && !enviando ? 'var(--color-primary-text)'              : 'var(--text-secondary)',
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: INSIGNIAS ─────────────────────────────────── */}
      {tab === 'insignias' && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <Award size={16} style={{ color: 'var(--color-warning)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {t('tezca.insigniasTitle', { count: insignias.length })}
            </h3>
          </div>
          {insignias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <span style={{ fontSize: 40 }}>🏅</span>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t('tezca.noInsignias')}</p>
              <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('tezca.noInsigniasHint')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {insignias.map((ins) => (
                <InsigniaCard key={ins.id} insignia={ins} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs pb-2" style={{ color: 'var(--text-secondary)' }}>
        <img src={TezcaLogo} alt="T" style={{ width: 14, height: 14 }} />
        <span>{t('tezca.footer')}</span>
      </div>

    </div>
  )
}
