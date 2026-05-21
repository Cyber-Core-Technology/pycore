/**
 * Singleton WebSocket client for PyCore ERP.
 *
 * - Connects to ws(s)://host/ws/empresa/?token=<jwt>
 * - Reconnects with exponential backoff (max 30 s)
 * - Sends ping every 30 s to keep the connection alive
 * - Typed event subscriptions via .on() / .off()
 */

type WsStatus   = 'disconnected' | 'connecting' | 'connected' | 'error'
type Handler    = (payload: unknown) => void
type StatusCb   = (status: WsStatus) => void

const PING_INTERVAL_MS    = 30_000
const MAX_RECONNECT_DELAY = 30_000

function buildWsUrl(token: string): string {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8082'
  const wsBase = apiUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
    .replace(/\/$/, '')
  return `${wsBase}/ws/empresa/?token=${token}`
}

class WebSocketClient {
  private ws:                WebSocket | null = null
  private handlers:          Map<string, Set<Handler>> = new Map()
  private statusCallbacks:   Set<StatusCb> = new Set()
  private reconnectTimer:    ReturnType<typeof setTimeout>  | null = null
  private pingTimer:         ReturnType<typeof setInterval> | null = null
  private reconnectAttempts: number = 0
  private currentToken:      string | null = null
  private intentionalClose:  boolean = false

  // ── Public API ──────────────────────────────────────────────

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return
    this.intentionalClose = false
    this.currentToken     = token
    this._open(token)
  }

  disconnect(): void {
    this.intentionalClose = true
    this._clearTimers()
    this.ws?.close(1000, 'logout')
    this.ws = null
    this._setStatus('disconnected')
  }

  /** Subscribe to a domain event. Returns the unsubscribe function. */
  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return () => this.handlers.get(event)?.delete(handler)
  }

  /** Subscribe to connection status changes. Returns the unsubscribe function. */
  onStatus(cb: StatusCb): () => void {
    this.statusCallbacks.add(cb)
    return () => this.statusCallbacks.delete(cb)
  }

  getStatus(): WsStatus {
    if (!this.ws) return 'disconnected'
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN:       return 'connected'
      default:                   return 'disconnected'
    }
  }

  // ── Private ─────────────────────────────────────────────────

  private _open(token: string): void {
    this._setStatus('connecting')
    const url = buildWsUrl(token)
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this._setStatus('connected')
      this._startPing()
    }

    this.ws.onmessage = (e: MessageEvent) => {
      this._handleMessage(e.data as string)
    }

    this.ws.onerror = () => {
      this._setStatus('error')
    }

    this.ws.onclose = (e: CloseEvent) => {
      this._stopPing()
      if (this.intentionalClose) return
      // Code 4001 = auth rejected — do not reconnect
      if (e.code === 4001) {
        this._setStatus('error')
        return
      }
      this._setStatus('disconnected')
      this._scheduleReconnect()
    }
  }

  private _handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data) as { type: string; event?: string; payload?: unknown }
      if (msg.type === 'event' && msg.event) {
        const handlers = this.handlers.get(msg.event)
        handlers?.forEach((h) => h(msg.payload ?? {}))
        // Also fire wildcard handlers
        const wildcards = this.handlers.get('*')
        wildcards?.forEach((h) => h({ event: msg.event, payload: msg.payload }))
      }
    } catch {
      // Ignore malformed frames
    }
  }

  private _scheduleReconnect(): void {
    if (!this.currentToken) return
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      if (this.currentToken && !this.intentionalClose) {
        this._open(this.currentToken)
      }
    }, delay)
  }

  private _startPing(): void {
    this._stopPing()
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, PING_INTERVAL_MS)
  }

  private _stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private _clearTimers(): void {
    this._stopPing()
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private _setStatus(status: WsStatus): void {
    this.statusCallbacks.forEach((cb) => cb(status))
  }
}

export const wsClient = new WebSocketClient()
