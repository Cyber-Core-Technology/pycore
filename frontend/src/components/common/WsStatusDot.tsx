import { useWsStore } from '@/store/wsStore'

const STATUS_CONFIG = {
  connected:    { color: 'var(--color-success)', label: 'Tiempo real activo',      pulse: false },
  connecting:   { color: 'var(--color-warning)', label: 'Conectando...',           pulse: true  },
  disconnected: { color: '#6B7280',               label: 'Sin tiempo real',         pulse: false },
  error:        { color: 'var(--color-error)',   label: 'Error de conexión en RT', pulse: false },
}

export function WsStatusDot() {
  const status = useWsStore((s) => s.status)
  const cfg    = STATUS_CONFIG[status]

  return (
    <div
      title={cfg.label}
      className="flex items-center gap-1.5 cursor-default select-none"
    >
      <span
        className={cfg.pulse ? 'animate-pulse' : ''}
        style={{
          display:       'inline-block',
          width:         '8px',
          height:        '8px',
          borderRadius:  '50%',
          background:    cfg.color,
          flexShrink:    0,
        }}
      />
      <span
        className="hidden lg:inline text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        {status === 'connected' ? 'En vivo' : status === 'connecting' ? 'Conectando' : 'Offline'}
      </span>
    </div>
  )
}
