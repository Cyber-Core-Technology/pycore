import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types/store-customer.types'

interface CartState {
  carts: Record<string, CartItem[]>

  getCart:    (slug: string) => CartItem[]
  getCount:   (slug: string) => number
  getTotal:   (slug: string) => number
  addItem:    (slug: string, item: Omit<CartItem, 'cantidad'>) => void
  removeItem: (slug: string, productoId: string) => void
  updateQty:  (slug: string, productoId: string, qty: number) => void
  clearCart:  (slug: string) => void
}

export const useStorefrontCart = create<CartState>()(
  persist(
    (set, get) => ({
      carts: {},

      getCart: (slug) => get().carts[slug] ?? [],

      getCount: (slug) =>
        (get().carts[slug] ?? []).reduce((acc, i) => acc + i.cantidad, 0),

      getTotal: (slug) =>
        (get().carts[slug] ?? []).reduce(
          (acc, i) => acc + parseFloat(i.precio_venta || '0') * i.cantidad,
          0,
        ),

      addItem: (slug, item) => {
        set((state) => {
          const cart = [...(state.carts[slug] ?? [])]
          const idx  = cart.findIndex((i) => i.id === item.id)
          if (idx >= 0) {
            cart[idx] = { ...cart[idx], cantidad: cart[idx].cantidad + 1 }
          } else {
            cart.push({ ...item, cantidad: 1 })
          }
          return { carts: { ...state.carts, [slug]: cart } }
        })
      },

      removeItem: (slug, productoId) => {
        set((state) => ({
          carts: {
            ...state.carts,
            [slug]: (state.carts[slug] ?? []).filter((i) => i.id !== productoId),
          },
        }))
      },

      updateQty: (slug, productoId, qty) => {
        if (qty < 1) {
          get().removeItem(slug, productoId)
          return
        }
        set((state) => ({
          carts: {
            ...state.carts,
            [slug]: (state.carts[slug] ?? []).map((i) =>
              i.id === productoId ? { ...i, cantidad: qty } : i,
            ),
          },
        }))
      },

      clearCart: (slug) => {
        set((state) => ({ carts: { ...state.carts, [slug]: [] } }))
      },
    }),
    { name: 'sf_cart' },
  ),
)
