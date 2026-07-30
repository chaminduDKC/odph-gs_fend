import { apiClient } from './client'
import type { PartSale, CreatePartSaleRequest } from '@shared/types'

export const salesApi = {
  listSales: async (): Promise<PartSale[]> => {
    const response = await apiClient.get<PartSale[]>('/sales')
    return response.data
  },

  createSale: async (data: CreatePartSaleRequest): Promise<PartSale> => {
    const response = await apiClient.post<PartSale>('/sales', data)
    return response.data
  }
}
