import { WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { ROUTES } from '@/router/routes'

interface Props {
  children:  React.ReactNode
  /** Nombre legible del módulo para mostrar en el mensaje */
  label?:    string
}

/**
 * Bloquea el acceso a módulos que requieren conexión activa
 * (datos financieros, reportes, ventas históricas, RRHH).
 * Cuando hay red, renderiza children normalmente.
 */
export function OfflineGuard({ children, label }: Props) {
  const { isOffline } = useNetworkStatus()
  const navigate      = useNavigate()

  if (!isOffline) return <>{children}</>

  const moduleName = label ?? 'este módulo'

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        height:         '60vh',
        gap:            20,
        textAlign:      'center',
        padding:        '0 24px',
      }}
    >
      <div
        style={{
          width:          72,
          height:         72,
          borderRadius:   '50%',
          background:     'rgba(245,158,11,0.1)',
          border:         '1px solid rgba(245,158,11,0.25)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <WifiOff size={32} style={{ color: 'var(--color-warning)' }} />
      </div>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          Sin conexión
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 380 }}>
          {`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} requiere conexión a internet. Los datos de este módulo son sensibles y no se almacenan localmente.`}
        </p>
      </div>

      <button
        onClick={() => navigate(ROUTES.DASHBOARD)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          padding:      '10px 20px',
          borderRadius: 10,
          background:   'var(--color-warning)',
          color:        'var(--color-primary-text)',
          fontSize:     14,
          fontWeight:   600,
          cursor:       'pointer',
          border:       'none',
        }}
      >
        Ir al Dashboard
      </button>
    </div>
  )
}
