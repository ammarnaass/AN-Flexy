import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from './api'
import type { LoginInput, SetupOwnerInput } from '@shared/contracts/auth'

// حالة الخادم عبر TanStack Query (RULES 10.3). مفتاح الجلسة هو مصدر الحقيقة في الواجهة.
export const sessionKey = ['auth', 'session'] as const

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
      queryClient.clear() // إسقاط كاش المستخدم السابق عند تبديل الجلسة (RULES 10.3)
      queryClient.setQueryData(sessionKey, data)
    },
  })
}

export function useSetupOwner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetupOwnerInput) => authApi.setupOwner(input),
    onSuccess: (data) => {
      queryClient.clear()
      queryClient.setQueryData(sessionKey, data)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(sessionKey, null)
    },
  })
}
