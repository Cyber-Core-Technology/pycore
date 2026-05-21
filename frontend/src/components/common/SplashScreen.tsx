import { useEffect, useState } from 'react'

interface Props {
  onFinish: () => void
}

export function SplashScreen({ onFinish }: Props) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')

  useEffect(() => {
    const audio = new Audio('/sounds/login.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {}) // silencia el error si el navegador bloquea autoplay

    const t1 = setTimeout(() => setPhase('hold'), 100)
    const t2 = setTimeout(() => setPhase('exit'), 1800)
    const t3 = setTimeout(() => onFinish(), 2150)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onFinish])

  const visible = phase !== 'enter'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 20,
      background: '#070F0B',
      opacity: phase === 'exit' ? 0 : 1,
      transition: phase === 'exit' ? 'opacity 0.35s ease' : 'none',
    }}>

      {/* Glow de fondo */}
      <div style={{
        position: 'absolute',
        width: 340,
        height: 340,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(24,174,145,0.10) 0%, transparent 65%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s ease',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <img
        src="/favicon.svg"
        alt="PyCore ERP"
        style={{
          width: 80,
          height: 80,
          position: 'relative',
          zIndex: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(12px)',
          transition: 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
          filter: visible ? 'drop-shadow(0 0 18px rgba(24,174,145,0.45))' : 'none',
        }}
      />

      {/* Texto */}
      <div style={{
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s',
      }}>
        <p style={{
          color: '#E6F2EE',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          PyCore ERP
        </p>
        <p style={{
          color: 'rgba(167,207,197,0.5)',
          fontSize: 12,
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          margin: '5px 0 0 0',
          letterSpacing: '0.04em',
        }}>
          El núcleo de tu negocio
        </p>
      </div>

      {/* Barra de progreso */}
      <div style={{
        width: 100,
        height: 2,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease 0.3s',
      }}>
        <div style={{
          height: '100%',
          borderRadius: 2,
          background: 'linear-gradient(90deg, #0E7C66, #18AE91)',
          width: phase === 'hold' || phase === 'exit' ? '100%' : '0%',
          transition: phase === 'hold' ? 'width 1.55s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          boxShadow: '0 0 8px rgba(24,174,145,0.6)',
        }} />
      </div>

    </div>
  )
}
