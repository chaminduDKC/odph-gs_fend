import { apiClient } from './client'
import type { PurchaseTransaction, CreatePurchaseRequest, PaginatedResponse } from '@shared/types'

export const purchasesApi = {
  listPurchases: async (page = 1, pageSize = 12): Promise<PaginatedResponse<PurchaseTransaction>> => {
    const response = await apiClient.get<PaginatedResponse<PurchaseTransaction>>('/purchases', { params: { page, pageSize } })
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
  deletePurchase: async (id:string): Promise<PurchaseTransaction> => {
    const response = await apiClient.delete<PurchaseTransaction>(`/purchases/${id}`)
    // implement delete method
    ///////////////////////////////////////////////////////////////////////////////////
    return response.data
  },
  updatePurchase: async (id: string, amount: number, supplierId:string): Promise<PurchaseTransaction> => {
    console.log(typeof(amount))
    console.log("Fucking called p.id ", id)
    console.log("Fucking called s.id ", supplierId)
    console.log("amount  ", amount)
    const response = await apiClient.put<PurchaseTransaction>(`/purchases/${id}`, {amountPaid:Number(amount), supplierId:supplierId} )
    return response.data
  }
}
