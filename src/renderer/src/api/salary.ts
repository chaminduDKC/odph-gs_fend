import { apiClient } from './client'
import type { MonthlySalary, ComputeSalaryRequest } from '@shared/types'

export const salaryApi = {
  // Live calculation preview — calls GET /:workerId/:month (computeSalary)
  computeSalary: async (workerId: string, month: string): Promise<any> => {
    
    
    const response = await apiClient.get<any>(`/salary/${workerId}/${month}`)
    return response.data
  },

  // Save the salary to DB — calls POST /:workerId/:month (saveSalary)
  saveSalary: async (workerId: string, month: string, data?: ComputeSalaryRequest): Promise<MonthlySalary> => {
    const response = await apiClient.post<MonthlySalary>(`/salary/${workerId}/${month}`, data ?? {})
    return response.data
  },

  // Fetch previously saved salary record from MonthlySalary table
  getSalary: async (workerId: string, month: string): Promise<MonthlySalary> => {
    const response = await apiClient.get<MonthlySalary>(`/salary/${workerId}/${month}/saved`)
    return response.data
  }
}
