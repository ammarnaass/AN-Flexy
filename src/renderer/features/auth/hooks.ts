import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { authApi } from './api'
import type { LoginInput, SetupOwnerInput } from '@shared/contracts/auth'

// حالة الخادم عبر TanStack Query (RULES 10.3). مفتاح الجلسة هو مصدر الحقيقة في الواجهة.
export const sessionKey = ['auth', 'session'] as const

// يُسقط كاش خاصيات المستخدم السابق عند تبديل الجلسة (RULES 10.3) مع إبقاء استعلامات «auth» الحيّة.
// لا نستخدم queryClient.clear(): إزالة استعلام الجلسة تُفصل المراقب الحيّ في AuthGate، فلا تُحدَّث
// الواجهة بعد نجاح الدخول. نُبقي «auth» ونحذف ما عداه فقط.
function resetFeatureCaches(client: QueryClient): void {
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
}

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: () => authApi.session(), staleTime: Infinity })
}

export function useHasUsers() {
  return useQuery({ queryKey: ['auth', 'hasUsers'], queryFn: () => authApi.hasUsers() })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      resetFeatureCaches(queryClient) // إسقاط كاش المستخدم السابق دون لمس استعلام الجلسة الحيّ
      queryClient.setQueryData(sessionKey, data)
    },
  })
}

export function useSetupOwner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetupOwnerInput) => authApi.setupOwner(input),
    onSuccess: (data) => {
      resetFeatureCaches(queryClient)
      queryClient.setQueryData(sessionKey, data)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      resetFeatureCaches(queryClient)
      queryClient.setQueryData(sessionKey, null)
    },
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ['auth', 'users'],
    queryFn: () => authApi.listUsers(),
  })
}
