import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// مزوّدات التطبيق العمومية. عميل TanStack Query واحد لكل الجلسة (RULES 10.3).
export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
