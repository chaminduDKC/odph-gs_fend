import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, Clock, AlertTriangle, Users, FileText, Wrench } from 'lucide-react'
import { dashboardApi } from '../api/dashboard'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { StatusBadge } from '../components/StatusBadge'
import { DataTable, Column } from '../components/DataTable'
import { Job, InventoryItem } from '@shared/types'

export const DashboardPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboardStats
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-500">Failed to load dashboard</div>
  if (!data) return null

  const jobColumns: Column<Job>[] = [
    { header: 'Job No', accessorKey: 'jobNumber' },
    { header: 'Vehicle', accessorFn: (row) => row.vehicle?.regNumber || '-' },
    { 
      header: 'Status', 
      cell: ({ row }) => <StatusBadge status={row.status} type="job" />
    },
    { 
      header: 'Payment', 
      cell: ({ row }) => <StatusBadge status={row.paymentStatus} type="payment" />
    },
    { 
      header: 'Total', 
      accessorFn: (row) => `Rs. ${Number(row.totalBill).toFixed(2)}`
    }
  ]

  const itemColumns: Column<InventoryItem>[] = [
    { header: 'Item', accessorKey: 'name' },
    { header: 'Stock', accessorKey: 'quantity' },
    { header: 'Reorder At', accessorKey: 'reorderLevel' },
    { 
      header: 'Status', 
      cell: () => <StatusBadge status="CRITICAL" type="default" />
    }
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of your garage operations" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Revenue card with breakdown */}
        <div className="card border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 rounded-xl flex flex-col gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign size={20} className="text-green-500" />
            </div>
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Today's Revenue</span>
          </div>
          <p className="text-3xl font-bold text-white">
            Rs. {Number(data.todayRevenue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {data.revenueBreakdown && (
            <div className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-3 mt-1">
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>🔧 Jobs (PAID)</span>
                <span className="text-white font-medium">Rs. {Number(data.revenueBreakdown.jobRevenue).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>🔩 Part Sales</span>
                <span className="text-white font-medium">Rs. {Number(data.revenueBreakdown.partsRevenue).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>🚲 Bicycle Sales</span>
                <span className="text-white font-medium">Rs. {Number(data.revenueBreakdown.bicycleRevenue).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <StatCard 
          title="Bike Sales" 
          value={Number(data.revenueBreakdown.bicycleRevenue).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})} 
          icon={ Wrench } 
          colorClass="text-blue-500" 
        />

        <StatCard 
          title="Part Sales" 
          value={Number(data.revenueBreakdown.partsRevenue).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})} 
          icon={ Wrench } 
          colorClass="text-blue-500" 
        />

        <StatCard 
          title="Open Jobs" 
          value={data.openJobsCount} 
          icon={ Wrench } 
          colorClass="text-blue-500" 
        />
        <StatCard 
          title="Pending Payments" 
          value={data.pendingPayments} 
          icon={Clock} 
          colorClass="text-orange-500" 
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={data.lowStockCount} 
          icon={AlertTriangle} 
          colorClass="text-red-500" 
        />
        <StatCard 
          title="Staff Present Today" 
          value={data.presentTodayCount} 
          icon={Users} 
          colorClass="text-purple-500" 
        />
        <StatCard 
          title="Supplier Dues" 
          value={`Rs. ${Number(data.supplierDuesOutstanding).toLocaleString()}`}
          icon={FileText} 
          colorClass="text-yellow-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <Wrench size={20} className="text-[var(--color-accent)]" /> 
            Recent Jobs
          </h3>
          <DataTable data={data.recentJobs} columns={jobColumns} />
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" /> 
            Low Stock Items
          </h3>
          <DataTable data={data.lowStockItems} columns={itemColumns} emptyMessage="Inventory looks good!" />
        </div>
      </div>
    </div>
  )
}
