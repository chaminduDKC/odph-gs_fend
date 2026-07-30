import { apiClient } from './client'
import type { AttendanceRecord, BulkAttendanceRequest } from '@shared/types'

export const attendanceApi = {
  getAttendance: async (workerId: string, month: string): Promise<AttendanceRecord[]> => {
    const response = await apiClient.get<AttendanceRecord[]>(`/attendance`, {
      params: { workerId, month }
    })
    return response.data
  },

  getMonthAttendance: async (month: string): Promise<AttendanceRecord[]> => {
    const response = await apiClient.get<AttendanceRecord[]>(`/attendance/month`, {
      params: { month }
    })
    return response.data
  },

  saveBulkAttendance: async (data: BulkAttendanceRequest): Promise<void> => {
    await apiClient.post('/attendance/bulk', data)
  }
}
