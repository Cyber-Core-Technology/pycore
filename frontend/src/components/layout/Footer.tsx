import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { Mail, MessageCircle } from 'lucide-react'

export function Footer() {
  const { t } = useTranslation()
  const empresa = useAuthStore((s) => s.usuario?.empresa)
  const year = new Date().getFullYear()

  const CONTACTO = [
    { label: t('footer.techSupport'), href: 'mailto:scorpion@cyco.tech', icon: <Mail size={11} /> },
    { label: t('footer.chat'), href: 'https://wa.me/5215644084426', icon: <MessageCircle size={11} /> },
  ]

  return (
    <footer style={{
      flexShrink: 0,
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          {empresa?.nombre ?? 'PyCore ERP'}
        </span>
        {empresa?.plan && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
            background: 'rgba(24,174,145,0.12)', color: 'var(--color-primary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {empresa.plan}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {CONTACTO.map((item, i) => (
          <span key={item.href} style={{ display: 'flex', alignItems: 'center' }}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none',
                padding: '2px 8px', borderRadius: 4, transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              {item.icon}
              {item.label}
            </a>
            {i < CONTACTO.length - 1 && (
              <span style={{ fontSize: 10, color: 'var(--border)', userSelect: 'none' }}>·</span>
            )}
          </span>
        ))}
      </div>

      <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
        © {year} PyCore ERP
        <span style={{ color: 'var(--border)' }}>·</span>
        <Link to="/privacidad" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >{t('footer.privacy')}</Link>
        <span style={{ color: 'var(--border)' }}>·</span>
        <Link to="/terminos" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >{t('footer.terms')}</Link>
      </span>
    </footer>
  )
}
