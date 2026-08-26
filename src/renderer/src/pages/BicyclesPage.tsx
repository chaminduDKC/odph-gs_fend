import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, DollarSign, Trash2, ShieldCheck } from 'lucide-react'
import { bicyclesApi } from '../api/bicycles'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { Pagination } from '../components/Pagination'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Bicycle, BicycleStatus } from '@shared/types'
import { inventoryApi } from '@renderer/api/inventory'

export const BicyclesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<BicycleStatus | ''>('')
  const [page, setPage] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
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

  // Add Part State
  const [partItemId, setPartItemId] = useState('')
  const [partQty, setPartQty] = useState('1')

  useEffect(() => {
    setPage(1)
  }, [filterStatus])

  const { data: bicycleData, isLoading } = useQuery({
    queryKey: ['bicycles', filterStatus, page],
    queryFn: () => bicyclesApi.listBicycles(filterStatus as BicycleStatus || undefined, page)
  })

  useEffect(() => {
    if (bicycleData && page < bicycleData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['bicycles', filterStatus, page + 1],
        queryFn: () => bicyclesApi.listBicycles(filterStatus as BicycleStatus || undefined, page + 1)
      })
    }
  }, [bicycleData, page, filterStatus, queryClient])

  const { data: items = [] } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => (await inventoryApi.listItems(undefined, undefined, 1, 1000)).data
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

  const deleteMutation = useMutation({
    mutationFn: bicyclesApi.deleteBicycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bicycles'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (viewId === deleteId) {
        setViewId(null)
      }
      setDeleteId(null)
    }
  })

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; status: BicycleStatus }) =>
      bicyclesApi.updateStatus(data.id, data.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bicycles'] })
      queryClient.invalidateQueries({ queryKey: ['bicycle', viewId] })
    }
  })

  const addPartMutation = useMutation({
    mutationFn: (data: { id: string; itemId: string; quantity: number }) =>
      bicyclesApi.addBicyclePart(data.id, { itemId: data.itemId, quantity: data.quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bicycle', viewId] })
      queryClient.invalidateQueries({ queryKey: ['bicycles'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setPartItemId('')
      setPartQty('1')
    },
    onError(error: unknown) {
      console.log(error)
    }
  })

  const removePartMutation = useMutation({
    mutationFn: (data: { bicycleId: string; partId: string }) =>
      bicyclesApi.removeBicyclePart(data.bicycleId, data.partId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bicycle', viewId] })
      queryClient.invalidateQueries({ queryKey: ['bicycles'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
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
    { header: 'Bought Price', accessorFn: (row) => `Rs. ${Number(row.boughtPrice).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}` },
    { header: 'Expenses', accessorFn: (row) => `Rs. ${Number(row.totalExpenses || 0).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}` },
    { header: 'Status', cell: ({ row }) => <StatusBadge status={row.status} type="bicycle" /> },
    {
      header: 'Profit',
      cell: ({ row }) => {
        if (!row.profit) return 'Not Yet'
        const p = Number(row.profit)
        return <span className={`font-medium ${p > 0 ? 'text-green-500' : 'text-red-500'}`}>Rs. {p.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
      }
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
            onClick={() => setViewId(row.id)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
            onClick={() => setDeleteId(row.id)}
            title="Delete Bicycle"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ]

  const tabs: { label: string; value: BicycleStatus | '' }[] = [
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

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Bicycle"
        message="Are you sure you want to delete this bicycle record? Any attached parts will be returned to inventory stock."
        isLoading={deleteMutation.isPending}
      />

      <DataTable data={bicycleData?.data ?? []} columns={columns} isLoading={isLoading} />

      <Pagination
        page={page}
        totalPages={bicycleData?.totalPages ?? 1}
        total={bicycleData?.total}
        pageSize={bicycleData?.pageSize}
        onPageChange={setPage}
      />

      {/* Add Bicycle Modal */}
      <Modal isOpen={isAddOpen} onClose={closeAddModal} title="Add New Bicycle">
        <form
          onSubmit={e => {
            e.preventDefault()
            createMutation.mutate({ description, boughtPrice: Number(boughtPrice), boughtDate })
          }}
          className="space-y-4"
        >
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

      {/* View Bicycle Modal */}
      <Modal
        isOpen={!!viewId}
        onClose={() => { setViewId(null); setIsSellOpen(false) }}
        title="Bicycle Details"
        size="lg"
      >
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
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Bought: {new Date(viewBicycle.boughtDate).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-[var(--color-bg-primary)]">
            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
                <h4 className="font-semibold flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--color-accent)]" /> Attached Parts</h4>
              </div>
                  <div className="p-4 bg-[var(--color-bg-primary)]">
                {viewBicycle.parts && viewBicycle.parts.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                        <th className="pb-2 font-medium">Part Name</th>
                        <th className="pb-2 font-medium text-right">Qty</th>
                        <th className="pb-2 font-medium text-right">Unit Price</th>
                        <th className="pb-2 font-medium text-right">Sold Price</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                        {viewBicycle.status !== "SOLD" && <th className="pb-2 font-medium text-right">Remove</th> }
                        
                      </tr>
                    </thead>
                    <tbody>
                      {viewBicycle.parts && viewBicycle.parts.map((part:any) => (
                        <tr key={part.id} className="border-b border-[var(--color-border)]/50 hover:bg-white/5">
                          <td className="py-2">{part.item?.name || 'Unknown Item'}</td>
                          <td className="py-2 text-right">{part.quantity}</td>
                          <td className="py-2 text-right">Rs. {Number(part.unitPriceSnapshot).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td className="py-2 text-right">Rs. {Number(part.sellingPriceSnapshot).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td className="py-2 text-right">Rs. {(part.quantity * Number(part.unitPriceSnapshot)).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td className="py-2 text-right">
                            {viewBicycle.status !== "SOLD" && 
                              <button
                            
                              onClick={() => removePartMutation.mutate({ bicycleId: viewBicycle.id, partId: part.id })}
                              disabled={removePartMutation.isPending}
                              className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              title="Remove part"
                            >
                              <Trash2 size={14} />
                            </button>
                             }
                            
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] italic py-2">No parts attached yet.</p>
                )}





            
            {viewBicycle.status !== 'SOLD' && (
              <form
                className="flex gap-2 mt-4 items-end bg-[var(--color-bg-secondary)] p-3 rounded border border-[var(--color-border)]"
                onSubmit={e => {
                  e.preventDefault()
                  if (partItemId) {
                    addPartMutation.mutate({
                      id: viewBicycle.id,
                      itemId: partItemId,
                      quantity: Number(partQty)
                    })
                  }
                }}
              >
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Select Part</label>
                  <select
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none"
                    value={partItemId}
                    onChange={e => setPartItemId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Inventory Item --</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                        {item.name} (Stock: {item.quantity}) - Rs. {item.sellingPrice}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={partQty}
                    onChange={e => setPartQty(e.target.value)}
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none"
                  />
                </div>
                {/* ✅ FIX 3: type="submit" now works because it's inside a <form> */}
                <button type="submit" disabled={addPartMutation.isPending} className="btn btn-primary py-1.5 px-3 h-[34px]">
                  <Plus size={16} /> Add Part
                </button>
              </form>
            )}

            </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 border-b border-[var(--color-border)] pb-2">Expenses</h4>
                <div className="bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)] overflow-hidden">
                  <div className="max-h-40 overflow-y-auto p-2">
                    {viewBicycle.expenses?.length
                      ? viewBicycle.expenses.map((e:any) => (
                          <div key={e.id} className="flex justify-between text-sm py-1.5 border-b border-[var(--color-border)]/50 last:border-0">
                            <span className="text-[var(--color-text-secondary)]">{e.description}</span>
                            <span className="font-medium text-white">Rs. {Number(e.amount).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                          </div>
                        ))
                      : <p className="text-xs text-[var(--color-text-muted)] p-2 text-center">No expenses recorded.</p>
                    }
                  </div>
                  {viewBicycle.status !== 'SOLD' && (
                    <form
                      className="flex gap-2 p-2 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]"
                      onSubmit={e => {
                        e.preventDefault()
                        if (expDesc && expAmount) {
                          expenseMutation.mutate({ id: viewBicycle.id, desc: expDesc, amount: Number(expAmount) })
                        }
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Detail"
                        required
                        value={expDesc}
                        onChange={e => setExpDesc(e.target.value)}
                        className="w-full text-xs p-1.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-white outline-none focus:border-[var(--color-accent)]"
                      />
                      <input
                        type="number"
                        placeholder="Amt"
                        required
                        value={expAmount}
                        onChange={e => setExpAmount(e.target.value)}
                        className="w-20 text-xs p-1.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-white outline-none focus:border-[var(--color-accent)]"
                      />
                      <button type="submit" disabled={expenseMutation.isPending} className="btn-primary p-1.5 rounded text-white flex items-center justify-center">
                        <Plus size={14} />
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="card p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold mb-3">Financials</h4>
                  <div className="flex justify-between text-sm mb-2 text-[var(--color-text-secondary)]">
                    <span>Bought Price</span>
                    <span>Rs. {Number(viewBicycle.boughtPrice).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 text-[var(--color-accent)]">
                    <span>Attached Parts</span>
                    <span>Rs. {Number(viewBicycle.totalAttachedPartsSellingRevenue || 0).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 text-[var(--color-accent)]">
                    <span >Attached Parts Cost</span>
                    <span>Rs. {Number(viewBicycle.totalAttachedPartsCost || 0).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 text-[var(--color-success)]">
                    <span >Attached Parts Profit</span>
                    <span>Rs. {Number(viewBicycle.totalPartsProfit || 0).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 text-[var(--color-accent-hover)]">
                    <span>Total Expenses</span>
                    <span>Rs. {Number(viewBicycle.totalExpenses || 0).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-[var(--color-border)] pt-2 mt-2">
                    <span>Total Cost Base</span>
                    <span>Rs. {(Number(viewBicycle.boughtPrice) + Number(viewBicycle.totalAttachedPartsCost) + Number(viewBicycle.totalExpenses || 0)).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>

                  {viewBicycle.status === 'SOLD' && (
                    <>
                      <div className="flex justify-between text-sm mt-4 font-medium">
                        <span>Sold Price</span>
                        <span>Rs. {Number(viewBicycle.soldPrice).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                      </div>
                      <div className="flex justify-between text-base mt-2 pt-2 border-t border-[var(--color-border)] font-bold text-white">
                        <span>Parts Profit</span>
                        <span className={Number(viewBicycle.profit) > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
                          Rs. {Number(viewBicycle.totalPartsProfit).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}
                        </span>
                      </div>
                      <div className="flex justify-between text-base mt-2 pt-2 border-t border-[var(--color-border)] font-bold text-white">
                        <span>Bike Profit</span>
                        <span className={Number(viewBicycle.profit) > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
                          Rs. {Number(viewBicycle.profit).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}
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

                <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex justify-end">
                  <button
                    type="button"
                    className="btn bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs py-1.5 px-3 flex items-center gap-1.5 transition-colors"
                    onClick={() => setDeleteId(viewBicycle.id)}
                  >
                    <Trash2 size={14} /> Delete Bicycle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}