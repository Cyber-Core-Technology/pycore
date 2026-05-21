import { create } from 'zustand'

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface WsState {
  status: WsStatus
  setStatus: (status: WsStatus) => void
}

export const useWsStore = create<WsState>()((set) => ({
  status:    'disconnected',
  setStatus: (status) => set({ status }),
}))
