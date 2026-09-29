import { apiClient } from './client'
import type { PartSale, CreatePartSaleRequest, PaginatedResponse } from '@shared/types'

export const salesApi = {
  listSales: async (page = 1, pageSize = 12, showDeleted = false): Promise<PaginatedResponse<PartSale>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (showDeleted) params.showDeleted = 'true'
    const response = await apiClient.get<PaginatedResponse<PartSale>>('/sales', { params })
    return response.data
  },

  createSale: async (data: CreatePartSaleRequest): Promise<PartSale> => {
    const response = await apiClient.post<PartSale>('/sales', data)
    return response.data
  },

  deleteSale: async (id: string): Promise<void> => {
    await apiClient.delete(`/sales/${id}`)
  },

  restoreSale: async (id: string): Promise<{ message: string; sale: PartSale }> => {
    const response = await apiClient.patch<{ message: string; sale: PartSale }>(`/sales/${id}/restore`)
    return response.data
  },

  permanentDeleteSale: async (id: string): Promise<void> => {
    await apiClient.delete(`/sales/${id}/permanent`)
  }
}
