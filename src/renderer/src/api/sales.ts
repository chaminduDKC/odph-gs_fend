import { apiClient } from './client'
import type { PartSale, CreatePartSaleRequest, PaginatedResponse } from '@shared/types'

export const salesApi = {
  listSales: async (page = 1, pageSize = 12): Promise<PaginatedResponse<PartSale>> => {
    const response = await apiClient.get<PaginatedResponse<PartSale>>('/sales', { params: { page, pageSize } })
    return response.data
  },

  createSale: async (data: CreatePartSaleRequest): Promise<PartSale> => {
    const response = await apiClient.post<PartSale>('/sales', data)
    return response.data
  }
}
