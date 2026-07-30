import { apiClient } from './client'
import type { Customer, CreateCustomerRequest, Vehicle } from '@shared/types'

export const customersApi = {
  listCustomers: async (search?: string): Promise<Customer[]> => {
    const params = search ? { search } : undefined
    const response = await apiClient.get<Customer[]>('/customers', { params })
    return response.data
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<Customer>(`/customers/${id}`)
    return response.data
  },

  createCustomer: async (data: CreateCustomerRequest): Promise<Customer> => {
    const response = await apiClient.post<Customer>('/customers', data)
    return response.data
  },

  updateCustomer: async (id: string, data: Partial<CreateCustomerRequest>): Promise<Customer> => {
    const response = await apiClient.put<Customer>(`/customers/${id}`, data)
    return response.data
  },

  deleteCustomer: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`)
  },

  getCustomerVehicles: async (id: string): Promise<Vehicle[]> => {
    const response = await apiClient.get<Vehicle[]>(`/customers/${id}/vehicles`)
    return response.data
  }
}
