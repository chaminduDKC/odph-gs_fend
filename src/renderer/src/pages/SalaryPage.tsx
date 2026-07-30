import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calculator, Save } from 'lucide-react'
import { salaryApi } from '../api/salary'
import { workersApi } from '../api/workers'
import { PageHeader } from '../components/PageHeader'
import { FormField } from '../components/FormField'
import { LoadingSpinner } from '../components/LoadingSpinner'

export const SalaryPage: React.FC = () => {
  const queryClient = useQueryClient()
  const today = new Date()
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [workerId, setWorkerId] = useState('')
  
  // Salary inputs
  const [bonuses, setBonuses] = useState('0')
  const [deductions, setDeductions] = useState('0')
  const [advancesDeducted, setAdvancesDeducted] = useState('0')

  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: () => workersApi.listWorkers() })

    const { data: salaryData, isLoading, } = useQuery({
      queryKey: ['salary-get', workerId, month],
      queryFn: () => salaryApi.getSalary(workerId, month),
      enabled: !!workerId && !!month,
      retry: false
    })

  const { data: salaryResult, isLoading: isComputing, refetch: computeSalary, isError } = useQuery({
    queryKey: ['salary-compute', workerId, month],
    queryFn: () => salaryApi.computeSalary(workerId, month),
    enabled: false,
    retry: false
  })

  const saveMutation = useMutation({

    mutationFn: () => salaryApi.saveSalary(workerId, month, {
      bonuses: Number(bonuses), 
      deductions: Number(deductions),
      advancesDeducted:Number(advancesDeducted)
      // advances
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-compute'] })
    },
    onError: (err: any) => {
      console.log(err)
    }
  })

  // Compute net salary from live result + adjustments
  const netSalary = salaryData && salaryResult
    ? (Number(salaryData.netSalary)) + (Number(salaryResult.basePay) + Number(salaryResult.attendancePay) + Number(bonuses) - Number(deductions) - Number(salaryResult.advancesDeducted))
    : 0
  // const netSalary = salaryResult
  //   ? (Number(salaryResult.basePay) + Number(salaryResult.attendancePay) + Number(bonuses) - Number(deductions) - Number(salaryResult.advancesDeducted))
  //   : 0

  const handleCompute = () => {
    if (!workerId || !month) return
    computeSalary()
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <PageHeader title="Salary Computation" subtitle="Calculate and record monthly salaries" />

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <FormField label="Select Worker" as="select" value={workerId} onChange={e => setWorkerId(e.target.value)} className="mb-0">
            <option value="">-- Choose a worker --</option>
            {workers.filter(w => w.active).map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.role || 'Worker'})</option>
            ))}
          </FormField>
          
          <FormField label="Month" type="month" value={month} onChange={e => setMonth(e.target.value)} className="mb-0" />
          
          <button 
            className="btn btn-primary w-full h-[42px]"
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
                  {/* <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-[var(--color-text-secondary)]">Calculated Base Pay</span>
                    <span className="font-medium">Rs. {Number(salaryResult.basePay).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Attendance Allowance</span>
                    <span className="font-medium">Rs. {Number(salaryResult.attendancePay).toFixed(2)}</span>
                  </div> */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Total Deductions</span>
                    <span className="font-medium">Rs. {Number(salaryData.deductions).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Total Added Bonuses</span>
                    <span className="font-medium">Rs. {Number(salaryData.bonuses).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-[var(--color-text-secondary)]">Adjustments</h4>
                  <FormField label="Bonuses / Overtime (Rs.)" type="number" min="0" value={bonuses} onChange={e => setBonuses(e.target.value)} />
                  <FormField label="Deductions (Rs.)" type="number" min="0" value={deductions} onChange={e => setDeductions(e.target.value)} />
                  <FormField label="Advances to Deduct (Rs.)" type="number" min="0" value={advancesDeducted} onChange={e => setAdvancesDeducted(e.target.value)} />
                  <button onClick={handleCompute} className="text-sm text-[var(--color-accent)] hover:underline">Recalculate with adjustments</button>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
