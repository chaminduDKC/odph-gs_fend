import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { salaryApi } from '../api/salary'
import { paysheetApi } from '../api/paysheet'
import { workersApi } from '../api/workers'
import { PageHeader } from '../components/PageHeader'
import { FormField } from '../components/FormField'
import { LoadingSpinner } from '../components/LoadingSpinner'

export const PaysheetPage: React.FC = () => {
  const today = new Date()
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [workerId, setWorkerId] = useState('')

  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: () => workersApi.listWorkers() })

  const { data: salaryData, isLoading, isError } = useQuery({
    queryKey: ['salary-get', workerId, month],
    queryFn: () => salaryApi.getSalary(workerId, month),
    enabled: !!workerId && !!month,
    retry: false
  })

  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!workerId || !month) return
    try {
      setIsDownloading(true)
      const blob = await paysheetApi.downloadPaysheet(workerId, month)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip_${workerId}_${month}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download payslip.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <PageHeader title="Payslips" subtitle="View and download monthly payslips" />

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Select Worker" as="select" value={workerId} onChange={e => setWorkerId(e.target.value)} className="mb-0">
            <option value="">-- Choose a worker --</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </FormField>
          <FormField label="Month" type="month" value={month} onChange={e => setMonth(e.target.value)} className="mb-0" />
        </div>
      </div>

      {!workerId ? (
        <div className="text-center p-12 card border-dashed text-[var(--color-text-muted)] flex flex-col items-center">
          <FileText size={48} className="mb-4 opacity-50" />
          <p>Select a worker to view their payslip</p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : isError || !salaryData ? (
        <div className="text-center p-8 card border-dashed text-[var(--color-warning)]">
          <p>No saved salary data found for this month.</p>
          <p className="text-sm mt-2 text-[var(--color-text-secondary)]">Go to the Salary page to compute and save it first.</p>
        </div>
      ) : (
        <div className="card relative overflow-hidden bg-white text-black p-8 shadow-xl print:shadow-none mx-auto max-w-2xl border-none">
          <div className="absolute top-0 left-0 w-full h-2 bg-[var(--color-accent)]" />
          
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-100">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">GMS</h2>
              <p className="text-sm text-slate-500 font-medium">Garage Management System</p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-widest text-[var(--color-accent)]">Payslip</h1>
              <p className="text-sm font-semibold text-slate-500 mt-1">{month}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Employee Details</p>
              <p className="font-bold text-slate-800 text-lg">{salaryData.worker?.name}</p>
              <p className="text-sm text-slate-600">{salaryData.worker?.role || 'Worker'}</p>
              <p className="text-sm text-slate-600">ID: {salaryData.worker?.id.slice(-6).toUpperCase()}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg text-right">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Payment Info</p>
              <p className="text-sm text-slate-600">Type: <span className="font-semibold">{salaryData.worker?.salaryType}</span></p>
              <p className="text-sm text-slate-600">Base Rate: Rs. {salaryData.worker?.baseRate}</p>
            </div>
          </div>

          <div className="mb-8 rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold uppercase text-xs">Description</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase text-xs">Earnings</th>
                  <th className="text-right py-3 px-4 font-semibold uppercase text-xs">Deductions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 font-medium">Basic Pay</td>
                  <td className="py-3 px-4 text-right">Rs. {Number(salaryData.basePay).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">-</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Attendance Pay</td>
                  <td className="py-3 px-4 text-right">Rs. {Number(salaryData.attendancePay).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">-</td>
                </tr>
                {Number(salaryData.bonuses) > 0 && (
                  <tr>
                    <td className="py-3 px-4 font-medium">Allowances / Bonus</td>
                    <td className="py-3 px-4 text-right">Rs. {Number(salaryData.bonuses).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">-</td>
                  </tr>
                )}
                {Number(salaryData.deductions) > 0 && (
                  <tr>
                    <td className="py-3 px-4 font-medium text-red-600">Deductions</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right text-red-600">Rs. {Number(salaryData.deductions).toFixed(2)}</td>
                  </tr>
                )}
                {Number(salaryData.advancesDeducted) > 0 && (
                  <tr>
                    <td className="py-3 px-4 font-medium text-red-600">Advance Recovery</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right text-red-600">Rs. {Number(salaryData.advancesDeducted).toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-1/2 bg-slate-800 text-white p-4 rounded-lg flex justify-between items-center shadow-md">
              <span className="font-semibold uppercase tracking-wider text-sm text-slate-300">Net Payable</span>
              <span className="text-2xl font-bold">Rs. {Number(salaryData.netSalary).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-end mt-12 border-t-2 border-gray-100 pt-8 text-sm text-slate-500 font-medium">
            <div className="text-center">
              <div className="w-40 border-b border-gray-300 mb-2"></div>
              Employer Signature
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-gray-300 mb-2"></div>
              Employee Signature
            </div>
          </div>
          
          <div className="mt-8 flex justify-center print:hidden">
            <button 
              className="btn btn-primary flex items-center gap-2 px-6 py-2.5 rounded-full shadow-lg"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download size={18} /> {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
