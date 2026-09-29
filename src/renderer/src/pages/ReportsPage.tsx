import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { reportsApi } from '../api/reports'
import { PageHeader } from '../components/PageHeader'
import { FormField } from '../components/FormField'
import { DataTable, Column } from '../components/DataTable'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { InventoryItem, Supplier } from '@shared/types'


type Tone = 'green' | 'red' | 'blue' | 'neutral'

const toneStyles: Record<Tone, { card: string; title: string; sub: string }> = {
  green:   { card: 'bg-green-500/10 border-green-500/20', title: 'text-green-400', sub: 'text-green-300/70' },
  red:     { card: 'bg-red-500/10 border-red-500/20',     title: 'text-red-400',   sub: 'text-red-300/70' },
  blue:    { card: 'bg-blue-500/10 border-blue-500/20',   title: 'text-blue-400',  sub: 'text-blue-300/70' },
  neutral: { card: 'bg-slate-500/10 border-slate-500/20', title: 'text-slate-300', sub: 'text-slate-400' }
}

const money = (v: string | number) =>
  Number(v).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface StatCardProps {
  title: string
  value: number
  tone: Tone
  note?: string
  rows?: { label: string; value: number }[]
  big?: boolean
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, tone, note, rows, big, className = '' }) => {
  const t = toneStyles[tone]
  return (
    <div className={`card ${t.card} ${className}`}>
      <p className={`text-sm font-semibold mb-1 ${t.title}`}>{title}</p>
      <p className={`${big ? 'text-4xl' : 'text-3xl'} font-bold ${value < 0 ? 'text-red-400' : 'text-white'}`}>
        Rs. {money(value)}
      </p>
      {note && <p className={`text-xs mt-2 ${t.sub}`}>{note}</p>}
      {rows && (
        <div className={`mt-2 space-y-0.5 text-xs ${t.sub}`}>
          {rows.map(r => (
            <div key={r.label} className="flex justify-between">
              <span>{r.label}</span><span>Rs. {money(r.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'inventory' | 'suppliers'>('monthly')
  const today = new Date()
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['report-monthly', month],
    queryFn: () => reportsApi.getMonthlyReport(month),
    enabled: activeTab === 'monthly'
  })



  const { data: inventoryData, isLoading: invLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.getInventoryReport(),
    enabled: activeTab === 'inventory'
  })

  const { data: suppliersData, isLoading: supLoading } = useQuery({
    queryKey: ['report-suppliers'],
    queryFn: () => reportsApi.getSupplierDuesReport(),
    enabled: activeTab === 'suppliers'
  })

  const invCols: Column<InventoryItem>[] = [
    { header: 'Item Name', accessorKey: 'name' },
    { header: 'Stock Qty', accessorKey: 'quantity' },
    { header: 'Unit Cost', accessorFn: (row) => `Rs. ${Number((Number(row.costValue) / Number(row.quantity)).toFixed(2)) || 0}` },
    { header: 'Selling Price', accessorFn: (row) => `Rs. ${Number((Number(row.sellingValue)/ Number(row.quantity)).toFixed(2) )|| 0}`},
    { header: 'Total Cost Value', accessorFn: (row) => `Rs. ${ Number(row.costValue).toFixed(2)}` },
    { header: 'Estimated Revenue', accessorFn: (row) => `Rs. ${ Number(row.sellingValue).toFixed(2)}` },
    { header: 'Potential Profit', accessorFn: (row) => `Rs. ${(Number(row.sellingValue - row.costValue)).toFixed(2)}`}
  ]

  const supCols: Column<Supplier>[] = [
    { header: 'Supplier Name', accessorKey: 'name' },
    { header: 'Contact', accessorFn: (row) => row.contact || '-' },
    { header: 'Balance Owed', cell: ({ row }) => <span className="text-red-500 font-semibold">Rs. {Number(row.balanceOwed).toFixed(2)}</span> }
  ]

  // Data for chart
  const chartData = monthlyData ? [
    { name: 'Jobs(Repair)', Revenue: (Number(monthlyData.jobsRepairRevenue)- Number(monthlyData.jobsAttachedParts)), Cost: monthlyData.netSalaryPaidMonth },
    { name: 'Parts', Revenue: monthlyData.partsRevenue, Cost: monthlyData.partsCost },
    { name: 'Bicycles', Revenue: monthlyData.bicycleRevenue, Cost: monthlyData.bicycleRevenue - monthlyData.bicycleProfit },
  ] : []

   const fmt = (price:string | number)=>{
    return Number(price).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})
  }
  const garageProfit = monthlyData ? Number(monthlyData.jobsLaborCost) - Number(monthlyData.netSalaryPaidMonth) : 0
  const ownerProfit = monthlyData ? Number(monthlyData.ownerGrossProfit) : 0
  const netProfit = garageProfit + ownerProfit

  return (
    <div className="animate-fade-in pb-10">
      <PageHeader title="Analytics & Reports" subtitle="Business performance and financial summaries" />

      <div className="flex gap-2 mb-8 border-b border-[var(--color-border)]">
        {[
          { id: 'monthly', label: 'Monthly P&L' },
          { id: 'inventory', label: 'Inventory Valuation' },
          { id: 'suppliers', label: 'Supplier Dues' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.id 
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]' 
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-white'
            }`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'monthly' && (
        <div className="space-y-6 animate-fade-in">
          <div className="w-64">
            <FormField label="Select Month" type="month" value={month} onChange={e => setMonth(e.target.value)} />
          </div>

          {monthlyLoading ? <LoadingSpinner /> : monthlyData && (
            <>
             {/* Bottom line first */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatCard
                  big
                  tone="blue"
                  title="Net Profit"
                  value={netProfit}
                  note="Garage Profit + Owner Profit"
                />
                <StatCard
                  big
                  tone="blue"
                  title="Garage Profit"
                  value={garageProfit}
                  note={`Labor income (Rs. ${money(monthlyData.jobsLaborCost)}) − Salaries (Rs. ${money(monthlyData.netSalaryPaidMonth)})`}
                />
                <StatCard
                  big
                  tone="blue"
                  title="Owner Profit"
                  value={ownerProfit}
                  note="Profit on parts sold, bikes sold and parts attached to repairs"
                />
              </div>

              {/* Where the money came from */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wide">Income sources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    tone="green"
                    title="Repair Labor Income"
                    value={Number(monthlyData.jobsRepairRevenue) - Number(monthlyData.jobsAttachedParts)}
                  />
                  <StatCard
                    tone="green"
                    title="Parts Used in Repairs"
                    value={monthlyData.jobsAttachedParts}
                    rows={[
                      { label: 'Parts cost', value: monthlyData.totalAttachedPartsCost },
                      { label: 'Profit', value: monthlyData.jobsAttachedParts - monthlyData.totalAttachedPartsCost }
                    ]}
                  />
                  <StatCard
                    tone="green"
                    title="Parts Sold"
                    value={monthlyData.partsRevenue}
                    rows={[
                      { label: 'Parts cost', value: monthlyData.partsCost },
                      { label: 'Profit', value: monthlyData.partsRevenue - monthlyData.partsCost }
                    ]}
                  />
                  <StatCard
                    tone="green"
                    title="Bicycles Sold"
                    value={monthlyData.bicycleRevenue}
                    rows={[
                      { label: 'Buying cost', value: monthlyData.bicycleCost },
                      { label: 'Repair cost', value: monthlyData.bicycleRepairExpeses },
                      { label: 'Parts cost', value: monthlyData.bicycleAttachedPartsCost },
                      { label: 'Profit', value: monthlyData.bicycleProfit }
                    ]}
                  />
                </div>
              </div>

              {/* Money going out */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wide">Expenses & stock</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <StatCard tone="red" title="Salary Payments" value={monthlyData.netSalaryPaidMonth} />
                  <StatCard
                    tone="neutral"
                    title="Stock Purchased"
                    value={Number(monthlyData.totalPurchaseCost)}
                    note="Inventory bought this month. Not the same as cost of goods sold."
                  />
                </div>
              </div>

              <div className="card h-68">
                <h3 className="text-lg font-semibold mb-6">Revenue Breakdown</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(value) => `${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="Cost" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-fade-in">
          {invLoading ? <LoadingSpinner /> : inventoryData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">Total Items</p>
                  <p className="text-3xl font-bold text-white">{inventoryData.items?.length ?? 0}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">Total Cost Value</p>
                  <p className="text-3xl font-bold text-white">Rs. {Number(inventoryData.totalCostValue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="card border-[var(--color-accent)]/50">
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">Estimated Revenue</p>
                  <p className="text-3xl font-bold text-[var(--color-accent)]">Rs. {Number(inventoryData.totalSellingValue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="card border-[var(--color-accent)]/50">
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">Potential Profit</p>
                  <p className="text-3xl font-bold text-[var(--color-accent)]">Rs. {Number(inventoryData.totalSellingValue - inventoryData.totalCostValue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-white">Inventory Breakdown</h3>
                <DataTable data={inventoryData.items} columns={invCols} />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="space-y-6 animate-fade-in">
          {supLoading ? <LoadingSpinner /> : suppliersData && (
            <>
              <div className="card bg-red-500/10 border-red-500/20 max-w-sm">
                <p className="text-sm text-red-400 font-semibold mb-1">Total Outstanding Dues</p>
                <p className="text-4xl font-bold text-white">
                  Rs. {(suppliersData as any[]).reduce((sum: number, s: any) => sum + Number(s.balanceOwed), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-white">Supplier Balances</h3>
                <DataTable data={suppliersData as any} columns={supCols} emptyMessage="No outstanding supplier dues." />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
