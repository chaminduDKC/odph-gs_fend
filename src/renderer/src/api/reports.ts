import { apiClient } from './client'
import type { MonthlyReport, InventoryValuation, SupplierDuesReport } from '@shared/types'

export const reportsApi = {
  getMonthlyReport: async (month: string): Promise<MonthlyReport> => {
    const response = await apiClient.get<MonthlyReport>('/reports/monthly', { params: { month } })
    return response.data
  },

  getInventoryReport: async (): Promise<InventoryValuation> => {
    const response = await apiClient.get<InventoryValuation>('/reports/inventory')
    return response.data
  },

  getSupplierDuesReport: async (): Promise<SupplierDuesReport> => {
    const response = await apiClient.get<SupplierDuesReport>('/reports/suppliers')
    return response.data
  }
}
