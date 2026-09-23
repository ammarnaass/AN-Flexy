import { createHashRouter } from 'react-router-dom'
import { AuthGate } from './AuthGate'
import { Layout } from './Layout'
import { PagePlaceholder } from '@renderer/shared/ui/PagePlaceholder'
import { SaleScreen } from '@renderer/pages/SaleScreen'
import { StockScreen } from '@renderer/pages/StockScreen'
import { ui } from '@renderer/shared/messages.ar'

// موجّه hash: مناسب لملفات file:// في الإنتاج وللاتصال بـ dev server في التطوير.
// البيع والمخزون حقيقيّان الآن (المرحلة 2)؛ بقيّة الشاشات تُستكمل في المراحل 3–4.
export const router = createHashRouter([
  {
    element: <AuthGate />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <PagePlaceholder title={ui.nav.dashboard} /> },
          { path: 'sale', element: <SaleScreen /> },
          { path: 'stock', element: <StockScreen /> },
          { path: 'customers', element: <PagePlaceholder title={ui.nav.customers} /> },
          { path: 'debts', element: <PagePlaceholder title={ui.nav.debts} /> },
          { path: 'reports', element: <PagePlaceholder title={ui.nav.reports} /> },
          { path: 'settings', element: <PagePlaceholder title={ui.nav.settings} /> },
        ],
      },
    ],
  },
])
