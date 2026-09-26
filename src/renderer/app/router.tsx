import { createHashRouter } from 'react-router-dom'
import { AuthGate } from './AuthGate'
import { Layout } from './Layout'
import { DashboardScreen } from '@renderer/pages/DashboardScreen'
import { SaleScreen } from '@renderer/pages/SaleScreen'
import { StockScreen } from '@renderer/pages/StockScreen'
import { CustomersDebtsScreen } from '@renderer/pages/CustomersDebtsScreen'
import { ReportsScreen } from '@renderer/pages/ReportsScreen'
import { SettingsScreen } from '@renderer/pages/SettingsScreen'

// موجّه hash: مناسب لملفات file:// في الإنتاج وللاتصال بـ dev server في التطوير.
// جميع شاشات التطبيق الأساسية مكتملة ومربوطة: لوحة التحكم، البيع، المخزون، الزبائن والديون، التقارير، والإعدادات.
export const router = createHashRouter([
  {
    element: <AuthGate />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <DashboardScreen /> },
          { path: 'sale', element: <SaleScreen /> },
          { path: 'stock', element: <StockScreen /> },
          { path: 'customers', element: <CustomersDebtsScreen /> },
          { path: 'reports', element: <ReportsScreen /> },
          { path: 'settings', element: <SettingsScreen /> },
        ],
      },
    ],
  },
])
