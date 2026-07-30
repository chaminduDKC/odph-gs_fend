import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, DollarSign } from 'lucide-react'
import { bicyclesApi } from '../api/bicycles'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { Bicycle, BicycleStatus } from '@shared/types'

export const BicyclesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<BicycleStatus | ''>('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [isSellOpen, setIsSellOpen] = useState(false)
  
  // Add Form
  const [description, setDescription] = useState('')
  const [boughtPrice, setBoughtPrice] = useState('0')
  const [boughtDate, setBoughtDate] = useState(() => new Date().toISOString().split('T')[0])
  
  // Expense Form
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('0')
  
  // Sell Form
  const [soldPrice, setSoldPrice] = useState('0')

  const { data: bicycles = [], isLoading } = useQuery({
    queryKey: ['bicycles', filterStatus],
    queryFn: () => bicyclesApi.listBicycles(filterStatus as BicycleStatus || undefined)
  })

  const { data: viewBicycle } = useQuery({
    queryKey: ['bicycle', viewId],
    queryFn: () => bicyclesApi.getBicycle(viewId!),
    enabled: !!viewId
  })

  const createMutation = useMutation({
    mutationFn: bicyclesApi.createBicycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bicycles'] })
      closeAddModal()
    }
  })

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; status: BicycleStatus }) => bicyclesApi.updateStatus(data.id, data.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bicycles'] })
      queryClient.invalidateQueries({ queryKey: ['bicycle', viewId] })
    }
  })

  const expenseMutation = useMutation({
    mutationFn: (data: { id: string; desc: string; amount: number }) => 
      bicyclesApi.addExpense(data.id, { description: data.desc, amount: data.amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bicycle', viewId] })
      queryClient.invalidateQueries({ queryKey: ['bicycles'] })
      setExpDesc('')
      setExpAmount('0')
    }
  })

  const sellMutation = useMutation({
    mutationFn: (data: { id: string; price: number }) => 
      bicyclesApi.sellBicycle(data.id, {
        soldPrice: data.price,
        soldDate: new Date().toISOString().split('T')[0]
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bicycles'] })
      queryClient.invalidateQueries({ queryKey: ['bicycle', viewId] })
      setIsSellOpen(false)
    }
  })

  const closeAddModal = () => {
    setIsAddOpen(false)
    setDescription('')
    setBoughtPrice('0')
  }

  const columns: Column<Bicycle>[] = [
    { header: 'Description', accessorKey: 'description' },
    { header: 'Bought Date', accessorFn: (row) => new Date(row.boughtDate).toLocaleDateString('en-GB') },
    { header: 'Bought Price', accessorFn: (row) => `Rs. ${Number(row.boughtPrice).toFixed(2)}` },
    { header: 'Expenses', accessorFn: (row) => `Rs. ${Number(row.totalExpenses || 0).toFixed(2)}` },
    { header: 'Status', cell: ({ row }) => <StatusBadge status={row.status} type="bicycle" /> },
    { 
      header: 'Profit', 
      cell: ({ row }) => {
        if (!row.profit) return '-'
        const p = Number(row.profit)
        return <span className={`font-medium ${p > 0 ? 'text-green-500' : 'text-red-500'}`}>Rs. {p.toFixed(2)}</span>
      }
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <button className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20" onClick={() => setViewId(row.id)}>
          <Eye size={16} />
        </button>
      )
    }
  ]

  const tabs: { label: string, value: BicycleStatus | '' }[] = [
    { label: 'All', value: '' },
    { label: 'In Stock', value: 'IN_STOCK' },
    { label: 'Under Repair', value: 'UNDER_REPAIR' },
    { label: 'Sold', value: 'SOLD' }
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Bicycles Project" 
        subtitle="Manage buying, repairing, and selling of used bicycles"
        action={
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={18} /> Buy Bicycle
          </button>
        }
      />

      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.value}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterStatus === tab.value 
                ? 'bg-[var(--color-accent)] text-white' 
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
            onClick={() => setFilterStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable data={bicycles} columns={columns} isLoading={isLoading} />

      <Modal isOpen={isAddOpen} onClose={closeAddModal} title="Add New Bicycle">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ description, boughtPrice: Number(boughtPrice), boughtDate }) }} className="space-y-4">
          <FormField label="Description (Model/Color)" required value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bought Price (Rs.)" type="number" required min="0" value={boughtPrice} onChange={e => setBoughtPrice(e.target.value)} />
            <FormField label="Bought Date" type="date" required value={boughtDate} onChange={e => setBoughtDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>Save</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewId} onClose={() => { setViewId(null); setIsSellOpen(false) }} title="Bicycle Details" size="lg">
        {viewBicycle && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Status</p>
                <div className="flex flex-col gap-2">
                  <StatusBadge status={viewBicycle.status} type="bicycle" />
                  {viewBicycle.status !== 'SOLD' && (
                    <div className="flex gap-1 mt-1">
                      <button 
                        onClick={() => statusMutation.mutate({ id: viewBicycle.id, status: 'IN_STOCK' })}
                        className={`text-[10px] px-2 py-1 rounded border ${viewBicycle.status === 'IN_STOCK' ? 'border-info text-info bg-info/10' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                      >IN STOCK</button>
                      <button 
                        onClick={() => statusMutation.mutate({ id: viewBicycle.id, status: 'UNDER_REPAIR' })}
                        className={`text-[10px] px-2 py-1 rounded border ${viewBicycle.status === 'UNDER_REPAIR' ? 'border-warning text-warning bg-warning/10' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                      >REPAIR</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="card p-4 col-span-2">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Description</p>
                <p className="font-semibold text-lg">{viewBicycle.description}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Bought: {new Date(viewBicycle.boughtDate).toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 border-b border-[var(--color-border)] pb-2">Expenses</h4>
                <div className="bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)] overflow-hidden">
                  <div className="max-h-40 overflow-y-auto p-2">
                    {viewBicycle.expenses?.length ? viewBicycle.expenses.map(e => (
                      <div key={e.id} className="flex justify-between text-sm py-1.5 border-b border-[var(--color-border)]/50 last:border-0">
                        <span className="text-[var(--color-text-secondary)]">{e.description}</span>
                        <span className="font-medium text-white">Rs. {Number(e.amount).toFixed(2)}</span>
                      </div>
                    )) : <p className="text-xs text-[var(--color-text-muted)] p-2 text-center">No expenses recorded.</p>}
                  </div>
                  {viewBicycle.status !== 'SOLD' && (
                    <form 
                      className="flex gap-2 p-2 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]"
                      onSubmit={e => {
                        e.preventDefault()
                        if(expDesc && expAmount) expenseMutation.mutate({ id: viewBicycle.id, desc: expDesc, amount: Number(expAmount) })
                      }}
                    >
                      <input type="text" placeholder="Detail" required value={expDesc} onChange={e => setExpDesc(e.target.value)} className="w-full text-xs p-1.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-white outline-none focus:border-[var(--color-accent)]" />
                      <input type="number" placeholder="Amt" required value={expAmount} onChange={e => setExpAmount(e.target.value)} className="w-20 text-xs p-1.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-white outline-none focus:border-[var(--color-accent)]" />
                      <button type="submit" disabled={expenseMutation.isPending} className="btn-primary p-1.5 rounded text-white flex items-center justify-center"><Plus size={14}/></button>
                    </form>
                  )}
                </div>
              </div>

              <div className="card p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold mb-3">Financials</h4>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--color-text-secondary)]">Bought Price</span>
                    <span>Rs. {Number(viewBicycle.boughtPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--color-text-secondary)]">Total Expenses</span>
                    <span>Rs. {Number(viewBicycle.totalExpenses || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-[var(--color-border)] pt-2 mt-2">
                    <span>Total Cost Base</span>
                    <span>Rs. {(Number(viewBicycle.boughtPrice) + Number(viewBicycle.totalExpenses || 0)).toFixed(2)}</span>
                  </div>
                  
                  {viewBicycle.status === 'SOLD' && (
                    <>
                      <div className="flex justify-between text-sm mt-4 text-[var(--color-success)] font-medium">
                        <span>Sold Price</span>
                        <span>Rs. {Number(viewBicycle.soldPrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base mt-2 pt-2 border-t border-[var(--color-border)] font-bold text-white">
                        <span>Net Profit</span>
                        <span className={Number(viewBicycle.profit) > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
                          Rs. {Number(viewBicycle.profit).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {viewBicycle.status !== 'SOLD' && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    {!isSellOpen ? (
                      <button className="w-full btn btn-primary py-2" onClick={() => setIsSellOpen(true)}>
                        <DollarSign size={16} /> Mark as Sold
                      </button>
                    ) : (
                      <form onSubmit={e => { e.preventDefault(); sellMutation.mutate({ id: viewBicycle.id, price: Number(soldPrice) }) }}>
                        <FormField label="Sold Price (Rs.)" type="number" required min="0" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} />
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsSellOpen(false)}>Cancel</button>
                          <button type="submit" className="btn btn-primary flex-1" disabled={sellMutation.isPending}>Confirm</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
