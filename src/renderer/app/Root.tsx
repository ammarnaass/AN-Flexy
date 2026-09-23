import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { router } from './router'

// مركّب الجذر: المزوّدات ثم الموجّه. تستورده main.tsx.
export function Root() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
