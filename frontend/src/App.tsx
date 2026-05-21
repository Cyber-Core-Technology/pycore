import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRouter }        from '@/router'
import { OfflineBanner }    from '@/components/common/OfflineBanner'
import { UpdatePrompt }     from '@/components/common/UpdatePrompt'
import { SyncStatusBanner } from '@/components/common/SyncStatusBanner'
import { InstallBanner }    from '@/components/common/InstallBanner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <AppRouter />
      <InstallBanner />
      <SyncStatusBanner />
      <UpdatePrompt />
    </QueryClientProvider>
  )
}