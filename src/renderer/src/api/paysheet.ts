import { apiClient } from './client'

export const paysheetApi = {
  downloadPaysheet: async (workerId: string, month: string): Promise<Blob> => {
    const response = await apiClient.get(`/paysheet/${workerId}/${month}/paysheet`, {
      responseType: 'blob'
    })
    return response.data
  }
}
