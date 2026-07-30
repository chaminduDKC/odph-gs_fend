import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { reportsApi } from '../api/reports'
import { PageHeader } from '../components/PageHeader'
import { FormField } from '../components/FormField'
import { DataTable, Column } from '../components/DataTable'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { InventoryItem, Supplier } from '@shared/types'

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
    { header: 'Unit Cost', accessorFn: (row) => `Rs. ${Number(row.unitCost).toFixed(2)}` },
    { header: 'Selling Price', accessorFn: (row) => `Rs. ${Number(row.sellingPrice).toFixed(2)}` },
    { header: 'Total Cost Value', accessorFn: (row) => `Rs. ${(row.quantity * Number(row.unitCost)).toFixed(2)}` },
    { header: 'Potential Profit', accessorFn: (row) => `Rs. ${(row.quantity * (Number(row.sellingPrice) - Number(row.unitCost))).toFixed(2)}` }
  ]

  const supCols: Column<Supplier>[] = [
    { header: 'Supplier Name', accessorKey: 'name' },
    { header: 'Contact', accessorFn: (row) => row.contact || '-' },
    { header: 'Balance Owed', cell: ({ row }) => <span className="text-red-500 font-semibold">Rs. {Number(row.balanceOwed).toFixed(2)}</span> }
  ]

  // Data for chart
  const chartData = monthlyData ? [
    { name: 'Repairs', Revenue: monthlyData.repairRevenue, Cost: 0 },
    { name: 'Parts', Revenue: monthlyData.partsRevenue, Cost: monthlyData.partsCost },
    { name: 'Bicycles', Revenue: monthlyData.bicycleRevenue, Cost: monthlyData.bicycleCost }
  ] : []

  // Computed totals (backend doesn't return these pre-summed)
  const totalRevenue = monthlyData
    ? (monthlyData.repairRevenue + monthlyData.partsRevenue + monthlyData.bicycleRevenue)
    : 0
  const totalCogs = monthlyData ? (monthlyData.partsCost + monthlyData.bicycleCost) : 0

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card bg-green-500/10 border-green-500/20">
                  <p className="text-sm text-green-400 font-semibold mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-white">Rs. {totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <div className="mt-2 space-y-0.5 text-xs text-green-300/70">
                    <div className="flex justify-between"><span>🔧 Repairs</span><span>Rs. {monthlyData.repairRevenue.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>🔩 Parts</span><span>Rs. {monthlyData.partsRevenue.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>🚲 Bicycles</span><span>Rs. {monthlyData.bicycleRevenue.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="card bg-red-500/10 border-red-500/20">
                  <p className="text-sm text-red-400 font-semibold mb-1">Cost of Goods</p>
                  <p className="text-3xl font-bold text-white">Rs. {totalCogs.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <div className="mt-2 space-y-0.5 text-xs text-red-300/70">
                    <div className="flex justify-between"><span>Parts cost</span><span>Rs. {monthlyData.partsCost.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Bicycle cost</span><span>Rs. {monthlyData.bicycleCost.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="card bg-blue-500/10 border-blue-500/20 lg:col-span-2">
                  <p className="text-sm text-blue-400 font-semibold mb-1">Gross Profit</p>
                  <p className={`text-4xl font-bold ${monthlyData.grossProfit >= 0 ? 'text-white' : 'text-red-400'}`}>Rs. {monthlyData.grossProfit.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-blue-300/70 mt-2">Revenue − Cost of Goods Sold</p>
                </div>
              </div>

              <div className="card h-96">
                <h3 className="text-lg font-semibold mb-6">Revenue Breakdown</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(value) => `Rs.${value}`} />
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
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">Potential Sales Value</p>
                  <p className="text-3xl font-bold text-[var(--color-accent)]">Rs. {Number(inventoryData.totalSellingValue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
