import { apiClient } from './client'
import type { PurchaseTransaction, CreatePurchaseRequest, PaginatedResponse } from '@shared/types'

export const purchasesApi = {
  listPurchases: async (page = 1, pageSize = 12, showDeleted = false): Promise<PaginatedResponse<PurchaseTransaction>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (showDeleted) params.showDeleted = 'true'
    const response = await apiClient.get<PaginatedResponse<PurchaseTransaction>>('/purchases', { params })
    return response.data
  },

  getPurchase: async (id: string): Promise<PurchaseTransaction> => {
    const response = await apiClient.get<PurchaseTransaction>(`/purchases/${id}`)
    return response.data
  },

  createPurchase: async (data: CreatePurchaseRequest): Promise<PurchaseTransaction> => {
    const response = await apiClient.post<PurchaseTransaction>('/purchases', data)
    return response.data
  },

  deletePurchase: async (id: string): Promise<PurchaseTransaction> => {
    const response = await apiClient.delete<PurchaseTransaction>(`/purchases/${id}`)
    return response.data
  },

  restorePurchase: async (id: string): Promise<{ message: string; purchase: PurchaseTransaction }> => {
    const response = await apiClient.patch<{ message: string; purchase: PurchaseTransaction }>(`/purchases/${id}/restore`)
    return response.data
  },

  permanentDeletePurchase: async (id: string): Promise<void> => {
    await apiClient.delete(`/purchases/${id}/permanent`)
  },

  updatePurchase: async (id: string, amount: number, supplierId: string): Promise<PurchaseTransaction> => {
    const response = await apiClient.put<PurchaseTransaction>(`/purchases/${id}`, { amountPaid: Number(amount), supplierId })
    return response.data
  }
}
