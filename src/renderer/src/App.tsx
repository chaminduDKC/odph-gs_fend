import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { Layout } from './components/Layout'
import { LoadingSpinner } from './components/LoadingSpinner'

// Pages
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CustomersPage } from './pages/CustomersPage'
import { VehiclesPage } from './pages/VehiclesPage'
import { JobsPage } from './pages/JobsPage'
import { InventoryPage } from './pages/InventoryPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { SalesPage } from './pages/SalesPage'
import { BicyclesPage } from './pages/BicyclesPage'
import { WorkersPage } from './pages/WorkersPage'
import { AttendancePage } from './pages/AttendancePage'
import { SalaryPage } from './pages/SalaryPage'
import { PaysheetPage } from './pages/PaysheetPage'
import { ReportsPage } from './pages/ReportsPage'

const App: React.FC = () => {
  const { isAuthenticated, isLoading, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="bicycles" element={<BicyclesPage />} />
        <Route path="workers" element={<WorkersPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="salary" element={<SalaryPage />} />
        <Route path="paysheet" element={<PaysheetPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
