import { apiClient } from './client'
import type { Supplier, CreateSupplierRequest, PurchaseTransaction, PaginatedResponse } from '@shared/types'

export const suppliersApi = {
  listSuppliers: async (search?: string, page = 1, pageSize = 12, showDeleted = false): Promise<PaginatedResponse<Supplier>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (search) params.search = search
    if (showDeleted) params.showDeleted = 'true'
    const response = await apiClient.get<PaginatedResponse<Supplier>>('/suppliers', { params })
    return response.data
  },

  getSupplier: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>(`/suppliers/${id}`)
    return response.data
  },

  createSupplier: async (data: CreateSupplierRequest): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/suppliers', data)
    return response.data
  },

  updateSupplier: async (id: string, data: Partial<CreateSupplierRequest>): Promise<Supplier> => {
    const response = await apiClient.put<Supplier>(`/suppliers/${id}`, data)
    return response.data
  },

  deleteSupplier: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`)
  },

  restoreSupplier: async (id: string): Promise<{ message: string; supplier: Supplier }> => {
    const response = await apiClient.patch<{ message: string; supplier: Supplier }>(`/suppliers/${id}/restore`)
    return response.data
  },

  permanentDeleteSupplier: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}/permanent`)
  },

  getSupplierTransactions: async (id: string): Promise<PurchaseTransaction[]> => {
    const response = await apiClient.get<PurchaseTransaction[]>(`/suppliers/${id}/transactions`)
    return response.data
  }
}
