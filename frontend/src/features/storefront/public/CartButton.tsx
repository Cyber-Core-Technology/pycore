// frontend/src/features/storefront/public/CartButton.tsx
import { ShoppingCart } from 'lucide-react'
import { useStorefrontCart } from '@/store/storefrontCartStore'

interface Props {
  slug:     string
  color:    string
  onClick:  () => void
}

export function CartButton({ slug, color, onClick }: Props) {
  const count = useStorefrontCart((s) => s.getCount(slug))

  return (
    <button
      onClick={onClick}
      aria-label="Ver carrito"
      style={{
        position: 'fixed', bottom: 24, right: 20,
        width: 52, height: 52, borderRadius: '50%',
        background: color, color: 'white',
        border: 'none', cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 800,
        transition: 'transform 0.15s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
    >
      <ShoppingCart size={22} />
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          background: 'var(--color-error)', color: 'white',
          borderRadius: '50%', minWidth: 20, height: 20,
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
