import { Outlet } from 'react-router-dom'
import { LoginScreen, useSession } from '@renderer/features/auth'
import { ui } from '@renderer/shared/messages.ar'

// بوابة الدخول: لا تُعرض أي شاشة قبل وجود جلسة صالحة في Main (RULES 8.4).
export function AuthGate() {
  const session = useSession()

  if (session.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-400">{ui.loading}</div>
    )
  }

  if (!session.data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoginScreen />
      </div>
    )
  }

  return <Outlet />
}
