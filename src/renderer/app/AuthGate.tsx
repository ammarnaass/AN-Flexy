import { Outlet } from 'react-router-dom'
import { LoginScreen, useSession } from '@renderer/features/auth'
import { ui } from '@renderer/shared/messages.ar'

// بوابة الدخول: لا تُعرض أي شاشة قبل وجود جلسة صالحة في Main (RULES 8.4).
export function AuthGate() {
  const session = useSession()

  if (session.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-space-md">
          <div className="w-10 h-10 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
          <p className="font-body-md text-body-md text-on-surface-variant">{ui.loading}</p>
        </div>
      </div>
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
