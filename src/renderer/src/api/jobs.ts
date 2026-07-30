import { apiClient } from './client'
import type { Job, CreateJobRequest, AddJobPartRequest, JobStatus, PaymentStatus } from '@shared/types'

export const jobsApi = {
  listJobs: async (status?: JobStatus): Promise<Job[]> => {
    const params = status ? { status } : undefined
    const response = await apiClient.get<Job[]>('/jobs', { params })
    return response.data
  },

  getJob: async (id: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/jobs/${id}`)
    return response.data
  },

  createJob: async (data: CreateJobRequest): Promise<Job> => {
    const response = await apiClient.post<Job>('/jobs', data)
    return response.data
  },

  updateJob: async (id: string, data: Partial<CreateJobRequest>): Promise<Job> => {
    const response = await apiClient.put<Job>(`/jobs/${id}`, data)
    return response.data
  },

  updateJobStatus: async (id: string, status: JobStatus, paymentStatus?: PaymentStatus): Promise<Job> => {
    const response = await apiClient.patch<Job>(`/jobs/${id}/status`, { status, paymentStatus })
    return response.data
  },

  addJobPart: async (id: string, data: AddJobPartRequest): Promise<Job> => {
    const response = await apiClient.post<Job>(`/jobs/${id}/parts`, data)
    return response.data
  },

  removeJobPart: async (id: string, partId: string): Promise<void> => {
    await apiClient.delete(`/jobs/${id}/parts/${partId}`)
  },

  downloadInvoice: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/jobs/${id}/invoice`, {
      responseType: 'blob'
    })
    return response.data
  }
}
