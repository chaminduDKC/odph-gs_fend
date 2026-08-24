import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calculator, Save, Trash2 } from 'lucide-react'
import { salaryApi } from '../api/salary'
import { workersApi } from '../api/workers'
import { PageHeader } from '../components/PageHeader'
import { FormField } from '../components/FormField'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Salary } from '@shared/types'
import { Modal } from '@renderer/components/Modal'
import { Column, DataTable } from '@renderer/components/DataTable'

type AdjustmentType = 'BONUS' | 'DEDUCTION' | 'ADVANCE';

export const SalaryPage: React.FC = () => {
  const queryClient = useQueryClient()
  const today = new Date()
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [workerId, setWorkerId] = useState('')

  // Single adjustment entry
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('BONUS')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentDescription, setAdjustmentDescription] = useState('')

  // logs data

  const [showLogsData, setShowLogsData] = useState(false);
  const [deleteLogId, setDeleteLogId] = useState("")
  const [salaryId, setSalaryId] = useState("")
  const [logsData, setLogsData] = useState<any>(null)

  const { data: workers = [] } = useQuery({
    queryKey: ['workers', 'all'],
    queryFn: async () => (await workersApi.listWorkers(undefined, 1, 1000)).data
  })

  const { data: salaryData, isLoading } = useQuery({
    queryKey: ['salary-get', workerId, month],
    queryFn: () => salaryApi.getSalary(workerId, month),
    enabled: !!workerId && !!month,
    retry: false
  })

  if(salaryData){
    console.log(salaryData)
  }
  const { data: salaryResult, isLoading: isComputing, refetch: computeSalary, isError } = useQuery({
    queryKey: ['salary-compute', workerId, month],
    queryFn: () => salaryApi.computeSalary(workerId, month),
    enabled: false,
    retry: false
  })


  if(logsData) console.log(logsData)

  // Derive bonuses/deductions/advances from the single adjustment entry
  const bonuses = adjustmentType === 'BONUS' ? Number(adjustmentAmount || 0) : 0
  const deductions = adjustmentType === 'DEDUCTION' ? Number(adjustmentAmount || 0) : 0
  const advancesDeducted = adjustmentType === 'ADVANCE' ? Number(adjustmentAmount || 0) : 0

  const saveMutation = useMutation({
    mutationFn: () => salaryApi.saveSalary(workerId, month, {
      bonuses,
      deductions,
      advancesDeducted,
      adjustmentDescription,
      adjustmentType
     
    }),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['salary-get', workerId, month] })
       queryClient.invalidateQueries({ queryKey: ['salary-compute', workerId, month], refetchType: 'active' })
      setAdjustmentAmount('')
      setAdjustmentDescription('')
    },
    onError: (err: any) => {
      console.log(err)
    }
  })

  // Compute net salary from live result + adjustments
  const netSalary = salaryData && salaryResult
    ? (Number(salaryData.netSalary)) + (Number(salaryResult.basePay) + Number(salaryResult.attendancePay) + bonuses - deductions - Number(salaryResult.advancesDeducted))
    : 0

  const handleCompute = () => {
    if (!workerId || !month) return
    computeSalary()
  }

  const columns: Column<Salary>[] = [
    { header: 'Description', accessorKey: 'description' },
    { header: 'Date', accessorFn: (row) => new Date(row.date).toLocaleDateString('en-GB') },
    { header: 'Type', accessorFn: (row) => `${row.type}` },
    { header: 'Amount', accessorFn: (row) => `Rs. ${Number(row.amount || 0).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}` },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <button
          className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"
          onClick={() => setDeleteLogId(row.id)}
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ]

  const handleShowLogs = async (salaryId: string) => {
  const logs = await queryClient.fetchQuery({
    queryKey: ['salary-records', salaryId, month],
    queryFn: () => salaryApi.getSalaryRecords(salaryId, month),
  })
  setLogsData(logs)
  setShowLogsData(true)
}

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <PageHeader title="Salary Computation" subtitle="Calculate and record monthly salaries" />

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <FormField label="Select Worker" as="select" value={workerId} onChange={e => setWorkerId(e.target.value)} className="mb-0">
            <option value="">-- Choose a worker --</option>
            {workers.filter(w => w.active).map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.role || 'Worker'})</option>
            ))}
          </FormField>

          <FormField label="Month" type="month" value={month} onChange={e => setMonth(e.target.value)} className="mb-0" />

          <button
            className="btn btn-primary mt-6.5 w-full h-[35px]"
            disabled={!workerId || !month || isComputing}
            onClick={handleCompute}
          >
            <Calculator size={18} /> {isComputing ? 'Computing...' : 'Compute Salary'}
          </button>
        </div>
      </div>

      {isComputing && <LoadingSpinner />}

      {isError && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded border border-red-500/20 text-center">
          Error computing salary. Make sure attendance data is available for this month.
        </div>
      )}

      {salaryResult && (
        <div className="card overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-bold border-b border-[var(--color-border)] pb-3 mb-6">Salary Breakdown for {month}</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[var(--color-text-secondary)]">Worker Details</label>
                  <p className="font-medium text-lg">{salaryResult.worker?.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{salaryResult.worker?.salaryType} - Base Rate: Rs. {salaryResult.worker?.baseRate}</p>
                </div>

                <div className="bg-[var(--color-bg-primary)] p-4 rounded border border-[var(--color-border)]">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Total Added Bonuses</span>
                    <span className="font-medium">Rs. {Number(salaryData?.bonuses || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Total Advance Paid</span>
                    <span className="font-medium text-[var(--color-error)]">Rs. {Number(salaryData?.advancesDeducted || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Total Deductions</span>
                    <span className="font-medium text-[var(--color-error)]">Rs. {Number(salaryData?.deductions || 0).toFixed(2)}</span>
                  </div>
                  
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-[var(--color-text-secondary)]">Adjustments</h4>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-[var(--color-text-secondary)]">Type</label>
                    <select
                      value={adjustmentType}
                      onChange={e => setAdjustmentType(e.target.value as AdjustmentType)}
                      className="border rounded px-2 py-1.5 w-full bg-[var(--color-bg-secondary)]"
                    >
                      <option value="BONUS">Bonus</option>
                      <option value="DEDUCTION">Deduction</option>
                      <option value="ADVANCE">Advance</option>
                    </select>
                  </div>

                  <FormField
                    label="Amount (Rs.)"
                    type="number"
                    min="0"
                    value={adjustmentAmount}
                    onChange={e => setAdjustmentAmount(e.target.value)}
                    className="w-full"
                  />

                  <FormField
                    label="Description"
                    type="text"
                    value={adjustmentDescription}
                    onChange={e => setAdjustmentDescription(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] p-8 rounded-xl border border-[var(--color-border)] shadow-lg text-center">
                  <div className="text-sm text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Net Salary</div>
                  <div className="text-5xl font-black text-[var(--color-accent)] mb-4 flex items-center justify-center gap-2">
                    <span className="text-2xl text-[var(--color-text-secondary)]">Rs.</span>
                    {netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="mt-8 flex justify-center">
                    <button
                      className="btn btn-primary px-8 py-3 text-lg"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                    >
                      <Save size={20} /> {saveMutation.isPending ? 'Saving...' : 'Lock & Save Salary'}
                    </button>
                  </div>
                </div>
                <button  className="btn btn-ghost px-8 py-3 text-lg mt-10" onClick={()=> {handleShowLogs(salaryData.id)}}>View logs</button>
              </div>
            </div>
          </div>
          <Modal size='xl' children={<DataTable columns={columns} data={logsData} emptyMessage='No logs to show'  />} isOpen={showLogsData} onClose={()=> setShowLogsData(false)} title='Salary logs' />
        </div>
      )}
    </div>
  )
}