import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, ChevronLeft, ChevronRight } from 'lucide-react'
import { attendanceApi } from '../api/attendance'
import { workersApi } from '../api/workers'
import { PageHeader } from '../components/PageHeader'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AttendanceStatus } from '@shared/types'

const STATUS_COLORS = {
  PRESENT: 'bg-green-500 text-white',
  ABSENT: 'bg-red-500 text-white',
  HALF_DAY: 'bg-yellow-500 text-white',
  LEAVE: 'bg-blue-500 text-white',
  NONE: 'bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
}

const STATUS_LABELS = {
  PRESENT: 'P',
  ABSENT: 'A',
  HALF_DAY: 'H',
  LEAVE: 'L',
  NONE: '-'
}

export const AttendancePage: React.FC = () => {
  const queryClient = useQueryClient()
  
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  
  const [localGrid, setLocalGrid] = useState<Record<string, Record<string, AttendanceStatus | 'NONE'>>>({})
  const [isDirty, setIsDirty] = useState(false)

  const { data: workers = [], isLoading: workersLoading } = useQuery({ 
    queryKey: ['workers'], 
    queryFn: () => workersApi.listWorkers() 
  })

  const { data: attendanceData = [], isLoading: attendanceLoading, isSuccess } = useQuery({
    queryKey: ['attendance', currentMonth],
    queryFn: () => attendanceApi.getMonthAttendance(currentMonth)
  })

  const saveMutation = useMutation({
    mutationFn: attendanceApi.saveBulkAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', currentMonth] })
      setIsDirty(false)
      
    }
  })

  const daysInMonth = useMemo(() => {
    const [year, month] = currentMonth.split('-')
    return new Date(Number(year), Number(month), 0).getDate()
  }, [currentMonth])

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  useEffect(() => {
    if (isSuccess && workers.length > 0) {
      const grid: Record<string, Record<string, AttendanceStatus | 'NONE'>> = {}
      
      workers.forEach(w => {
        grid[w.id] = {}
        for (let d = 1; d <= daysInMonth; d++) {
          grid[w.id][d.toString()] = 'NONE'
        }
      })
      
      attendanceData.forEach(record => {
        const d = new Date(record.date).getDate().toString()
        if (grid[record.workerId]) {
          grid[record.workerId][d] = record.status
        }
      })
      
      setLocalGrid(grid)
      setIsDirty(false)
    }
  }, [attendanceData, workers, daysInMonth, isSuccess])

  const activeWorkers = workers.filter(w => w.active)

  const handleCellClick = (workerId: string, day: string) => {
    setLocalGrid(prev => {
      const workerGrid = prev[workerId] || {}
      const current: AttendanceStatus | 'NONE' = workerGrid[day] ?? 'NONE'
      const sequence: (AttendanceStatus | 'NONE')[] = ['NONE', 'PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE']
      const currentIndex = sequence.indexOf(current)
      const next = sequence[(currentIndex + 1) % sequence.length]
      
      return {
        ...prev,
        [workerId]: {
          ...workerGrid,
          [day]: next
        }
      }
    })
    setIsDirty(true)
  }

  const handleSave = () => {
    const [year, month] = currentMonth.split('-')
    const records: { workerId: string; date: string; status: AttendanceStatus }[] = []
    
    Object.entries(localGrid).forEach(([workerId, days]) => {
      Object.entries(days).forEach(([day, status]) => {
        if (status !== 'NONE') {
          const dateStr = `${year}-${month}-${day.padStart(2, '0')}`
          records.push({ workerId, date: dateStr, status: status as AttendanceStatus })
        }
      })
    })
    
    saveMutation.mutate({ records })
  }

  const changeMonth = (delta: number) => {
    const [year, month] = currentMonth.split('-').map(Number)
    let newM = month + delta
    let newY = year
    if (newM > 12) { newM = 1; newY++ }
    if (newM < 1) { newM = 12; newY-- }
    setCurrentMonth(`${newY}-${String(newM).padStart(2, '0')}`)
  }

  const getMonthName = () => {
    const [year, month] = currentMonth.split('-')
    return new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  if (workersLoading || attendanceLoading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-120px)]">
      <PageHeader 
        title="Attendance Tracker" 
        action={
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={!isDirty || saveMutation.isPending}
          >
            <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        }
      />

      <div className="flex items-center justify-between mb-4 card p-3">
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-[var(--color-bg-primary)] rounded hover:bg-[var(--color-border)]"><ChevronLeft size={18}/></button>
          <span className="text-lg font-bold min-w-[150px] text-center">{getMonthName()}</span>
          <button onClick={() => changeMonth(1)} className="p-2 bg-[var(--color-bg-primary)] rounded hover:bg-[var(--color-border)]"><ChevronRight size={18}/></button>
        </div>
        
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1"><div className="w-4 h-4 bg-green-500 rounded-sm"></div> Present</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 bg-red-500 rounded-sm"></div> Absent</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 bg-yellow-500 rounded-sm"></div> Half Day</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 bg-blue-500 rounded-sm"></div> Leave</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] custom-scrollbar">
        {activeWorkers.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">No active workers found.</div>
        ) : (
          <table className="w-full text-sm min-w-[max-content] select-none">
            <thead className="sticky top-0 bg-[var(--color-bg-secondary)] z-10 border-b border-[var(--color-border)]">
              <tr>
                <th className="p-3 text-left font-semibold text-[var(--color-text-secondary)] sticky left-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] shadow-[1px_0_0_rgba(255,255,255,0.05)]">
                  Worker
                </th>
                {daysArray.map(day => (
                  <th key={day} className="p-2 text-center font-medium w-10 text-[var(--color-text-muted)] border-r border-[var(--color-border)]">
                    {day}
                  </th>
                ))}
                <th className="p-3 text-center font-medium text-[var(--color-accent)] w-16 sticky right-0 bg-[var(--color-bg-secondary)] shadow-[-1px_0_0_rgba(255,255,255,0.05)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {activeWorkers.map((w, idx) => {
                const totalPresent = Object.values(localGrid[w.id] || {}).reduce((sum, status) => {
                  if (status === 'PRESENT') return sum + 1
                  if (status === 'HALF_DAY') return sum + 0.5
                  return sum
                }, 0)

                return (
                  <tr key={w.id} className="border-b border-[var(--color-border)] hover:bg-white/[0.02]">
                    <td className="p-3 sticky left-0 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] font-medium">
                      {w.name}
                    </td>
                    {daysArray.map(day => {
                      const status = localGrid[w.id]?.[day.toString()] || 'NONE'
                      return (
                        <td key={day} className="p-1 border-r border-[var(--color-border)]">
                          <button
                            onClick={() => handleCellClick(w.id, day.toString())}
                            className={`w-full h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${STATUS_COLORS[status]}`}
                          >
                            {STATUS_LABELS[status]}
                          </button>
                        </td>
                      )
                    })}
                    <td className="p-3 text-center sticky right-0 bg-[var(--color-bg-card)] font-bold text-white">
                      {totalPresent}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
