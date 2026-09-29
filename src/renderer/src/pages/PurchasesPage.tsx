import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Trash2, Sparkles, Package, Trash, RotateCcw } from 'lucide-react'
import { purchasesApi } from '../api/purchases'
import { suppliersApi } from '../api/suppliers'
import { inventoryApi } from '../api/inventory'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { Pagination } from '../components/Pagination'
import { PurchaseTransaction, PurchaseType, Supplier } from '@shared/types'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { MessageDialog } from '@renderer/components/MessageDialog'
import { isAxiosError } from 'axios'
import { useF1Shortcut } from '../hooks/useF1Shortcut'

interface PurchaseLineItemState {
  id: string
  isCustom: boolean
  itemId: string
  name: string
  category: string
  quantity: number
  unitCost: number
  sellingPrice: number
  reorderLevel: number
}

export const PurchasesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [showDeleted, setShowDeleted] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [showDeleted])
  
  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ['purchases', page, showDeleted],
    queryFn: () => purchasesApi.listPurchases(page, 12, showDeleted)
  })

  useEffect(() => {
    if (purchaseData && page < purchaseData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['purchases', page + 1, showDeleted],
        queryFn: () => purchasesApi.listPurchases(page + 1, 12, showDeleted)
      })
    }
  }, [purchaseData, page, showDeleted, queryClient])

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: async () => (await suppliersApi.listSuppliers(undefined, 1, 1000)).data
  })
  const { data: items = [] } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => (await inventoryApi.listItems(undefined, undefined, 1, 1000)).data
  })

  const existingCategories = useMemo(() => {
    const cats = new Set<string>()
    items.forEach(i => {
      if (i.category) cats.add(i.category.trim())
    })
    return Array.from(cats)
  }, [items])

  // Form State
  const [supplierId, setSupplierId] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const [purchase, setPurchase] = useState<any>()
  const [paymentType, setPaymentType] = useState<PurchaseType>('CREDIT')
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [amountPaid, setAmountPaid] = useState('0')
  const [amountToPaid, setAmountToPaid] = useState('0')
  const [totalPayment, setTotalPayment] = useState(0)
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [deletingId, setDeletingId] = useState('')
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<PurchaseLineItemState[]>([])

  // Quick Supplier State
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierContact, setNewSupplierContact] = useState('')
  const [messageDialog, setMessageDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  useF1Shortcut(() => {
    setIsModalOpen(true)
  }, isModalOpen || isViewOpen || !!deletingId || !!restoreId || !!permanentDeleteId || isCreatingSupplier || !!messageDialog)

  const createSupplierMutation = useMutation({
    mutationFn: (data: { name: string; contact?: string }) => suppliersApi.createSupplier(data),
    onSuccess: (newSupp) => {
      queryClient.setQueryData<Supplier[]>(['suppliers', 'all'], (old) => {
        return old ? [newSupp, ...old] : [newSupp]
      })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setSupplierId(newSupp.id)
      setIsCreatingSupplier(false)
      setNewSupplierName('')
      setNewSupplierContact('')
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setMessageDialog({
          type: 'error',
          title: 'Failed to Create Supplier',
          message: error.response?.data?.message || 'Error creating supplier'
        })
      }
    }
  })

  const createMutation = useMutation({
    mutationFn: purchasesApi.createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeModal()
    }
  })

  const updatePaymentMutation = useMutation({
    mutationFn: (vars: { purchaseId: string; amountToPaid: number; supplierId: string }) => 
      purchasesApi.updatePurchase(vars.purchaseId, vars.amountToPaid, vars.supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      closeViewModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: purchasesApi.deletePurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setDeletingId('')
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.restorePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setRestoreId(null)
      setMessageDialog({ type: 'success', title: 'Restored', message: 'Purchase transaction restored successfully.' })
    },
    onError: (error: unknown) => {
      setRestoreId(null)
      if (isAxiosError(error)) {
        setMessageDialog({
          type: 'error',
          title: 'Cannot Restore',
          message: error.response?.data?.message || 'Failed to restore purchase'
        })
      }
    }
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.permanentDeletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setPermanentDeleteId(null)
      setMessageDialog({ type: 'success', title: 'Permanently Deleted', message: 'Purchase transaction permanently deleted.' })
    },
    onError: (error: unknown) => {
      setPermanentDeleteId(null)
      if (isAxiosError(error)) {
        setMessageDialog({
          type: 'error',
          title: 'Cannot Delete Permanently',
          message: error.response?.data?.message || 'Failed to permanently delete purchase'
        })
      }
    }
  })

  const closeModal = () => {
    setIsModalOpen(false)
    setSupplierId('')
    setPaymentType('CREDIT')
    setAmountPaid('0')
    setDueDate(() => {
      const today = new Date()
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    })
    setLineItems([])
  }

  const closeViewModal = () => {
    setIsViewOpen(false)
    setSupplierId('')
    setPaymentType('CREDIT')
    setAmountPaid('0')
    setDueDate('')
    setLineItems([])
    setAmountToPaid("0")
  }

  const handleEdit = (row: PurchaseTransaction) => {
    console.log(row);
    setPurchase(row)
    setSupplierId(row.supplierId)
    setPurchaseId(row.id)
    setPaymentType(row.paymentType)
    setAmountPaid(row.amountPaid)
    setDueDate(row.dueDate || '')
    setTotalPayment(Number(row.total))
    setIsViewOpen(true)
  }

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Math.random().toString(),
        isCustom: false,
        itemId: '',
        name: '',
        category: '',
        quantity: 1,
        unitCost: 0,
        sellingPrice: 0,
        reorderLevel: 5
      }
    ])
  }

  const handleAddCustomLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Math.random().toString(),
        isCustom: true,
        itemId: '',
        name: '',
        category: '',
        quantity: 1,
        unitCost: 0,
        sellingPrice: 0,
        reorderLevel: 5
      }
    ])
  }
  
  const handleToggleCustom = (id: string) => {
    setLineItems(lineItems.map(i => {
      if (i.id !== id) return i
      const nextIsCustom = !i.isCustom
      return {
        ...i,
        isCustom: nextIsCustom,
        itemId: nextIsCustom ? '' : i.itemId
      }
    }))
  }

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(i => i.id !== id))
  }
  
  const handleLineItemChange = (id: string, field: keyof PurchaseLineItemState, value: string | number | boolean) => {
    setLineItems(lineItems.map(i => {
      if (i.id !== id) return i
      
      const updatedItem = { ...i, [field]: value }
      if (field === 'itemId') {
        const selectedItem = items.find(it => it.id === value)
        if (selectedItem) {
          updatedItem.unitCost = Number(selectedItem.unitCost)
        }
      }
      return updatedItem
    }))
  }

  const total = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)), 0)
  }, [lineItems])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId) return alert('Please select a supplier')
    if (lineItems.length === 0) return alert('Please add at least one item')

    for (const [index, item] of lineItems.entries()) {
      if (item.isCustom) {
        if (!item.name.trim()) {
          return alert(`Item #${index + 1}: Please enter the custom item name`)
        }
        if (item.quantity <= 0) {
          return alert(`Item #${index + 1}: Quantity must be at least 1`)
        }
      } else {
        if (!item.itemId) {
          return alert(`Item #${index + 1}: Please select an inventory item or switch to custom item`)
        }
        if (item.quantity <= 0) {
          return alert(`Item #${index + 1}: Quantity must be at least 1`)
        }
      }
    }
    
    createMutation.mutate({
      supplierId,
      paymentType,
      amountPaid: Number(amountPaid),
      dueDate: paymentType === 'CREDIT' ? dueDate : undefined,
      items: lineItems.map((item) => {
        if (item.isCustom) {
          return {
            name: item.name.trim(),
            category: item.category.trim() || null,
            sellingPrice: Number(item.sellingPrice) || Number(item.unitCost),
            reorderLevel: Number(item.reorderLevel) || 5,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost)
          }
        }
        return {
          itemId: item.itemId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost)
        }
      })
    })
  }

  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if ((purchase as any)?.isDeleted) return
    updatePaymentMutation.mutate({
      purchaseId: purchaseId,       
      amountToPaid: Number(amountToPaid),
      supplierId: supplierId
    })
  }

  const columns: Column<PurchaseTransaction>[] = [
    { header: 'Date', accessorFn: (row) => new Date(row.createdAt).toLocaleDateString('en-LK') },
    { header: 'Supplier', accessorFn: (row) => row.supplier?.name || '-' },
    { header: 'Total', accessorFn: (row) => `Rs. ${Number(row.total).toFixed(2)}` },
    { header: 'Payment', cell: ({ row }) => <StatusBadge status={row.paymentType} type="payment" /> },
    { header: 'Paid', accessorFn: (row) => `Rs. ${Number(row.amountPaid).toFixed(2)}` },
    { header: 'Due', cell: ({ row }) => <span className={Number(row.amountDue) > 0 ? 'text-red-500' : 'text-green-500'}>Rs. {Number(row.amountDue).toFixed(2)}</span> },
    { header: 'Due Date', accessorFn: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-LK') : '-' },
    {
      header: 'Status',
      cell: ({ row }) => (row as any).isDeleted
        ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400">Deleted</span>
        : null
    },
    { header: 'Actions', cell: ({ row }) => (row as any).isDeleted ? (
      <div className="flex gap-2">
        <button className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20" onClick={()=> handleEdit(row)} title="View Details">
          <Eye size={16} />
        </button>
        <button className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20" onClick={()=> setRestoreId(row.id)} title="Restore Purchase">
          <RotateCcw size={16} />
        </button>
        <button className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20" onClick={()=> setPermanentDeleteId(row.id)} title="Delete Permanently">
          <Trash2 size={16} />
        </button>
      </div>
    ) : (
      <div className="flex gap-2">
        <button className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20" onClick={()=> handleEdit(row)} title="View Details">
          <Eye size={16} />
        </button>
        <button onClick={()=> setDeletingId(row.id)} className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20" title="Delete Purchase">
          <Trash2 size={16} />
        </button>
      </div>
    ) }
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Purchases" 
        action={
          <div className="flex gap-2 items-center">
            <button
              className={`btn ${showDeleted ? 'btn-danger' : 'btn-secondary'} flex items-center gap-2`}
              onClick={() => { setShowDeleted(v => !v); setPage(1) }}
              title={showDeleted ? 'Viewing deleted — click to go back' : 'Show deleted records'}
            >
              <Trash size={16} />
              {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
            </button>
            {!showDeleted && (
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> New Purchase
              </button>
            )}
          </div>
        }
      />
      {showDeleted && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <Trash size={14} />
          Showing deleted purchases. These records are soft-deleted and no longer active.
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={()=> setDeletingId("")}
        onConfirm={()=> {deletingId && deleteMutation.mutate(deletingId)}}
        message='Are you sure you want to delete this Purchase record? Inventory items also will be deleted related to this Purchase'
        title='Delete Purchase'
        isLoading={deleteMutation.isPending}
       />

      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
        title="Restore Purchase"
        message="Are you sure you want to restore this purchase record? The transaction and associated inventory items will become active again."
        isLoading={restoreMutation.isPending}
        confirmLabel="Restore"
        confirmVariant="success"
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteId}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
        title="Delete Purchase Permanently"
        message="Are you sure you want to permanently delete this purchase record and its purchase items from the database? This action CANNOT be undone."
        isLoading={permanentDeleteMutation.isPending}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />

      <Modal isOpen={isViewOpen} onClose={closeViewModal} title={(purchase as any)?.isDeleted ? 'View Credit Details (Deleted)' : 'Edit Credit Details'}>
        {(purchase as any)?.isDeleted && (
          <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <Trash2 size={14} />
            <span>This purchase is deleted. Details cannot be changed.</span>
          </div>
        )}
        <form onSubmit={handleSubmitUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className='text-left'>
              <div className="text-xs text-[var(--color-text-secondary)]">Total Amount</div>
              <div className="text-xl font-bold text-[var(--color-accent)]">Rs. {totalPayment.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
            <div className='text-right'>
              <div className="text-xs text-[var(--color-text-secondary)]">Amount Due</div>

              {purchase?.amountDue === '0' ? (<p  className="text-xl font-bold text-green-500">Paid</p>) : (<p className="text-xl font-bold text-red-500">Rs. {(totalPayment - Number(amountPaid)).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>)}
              
            </div>
              
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount Paid (Rs.)" type="number" required min="0" step="0.01" value={amountPaid} disabled onChange={e => setAmountPaid(e.target.value)} />
            <FormField label="Add New Payment (Rs.)" type="number" required min="0" disabled={(purchase as any)?.isDeleted || purchase?.amountDue === '0'} max={totalPayment - Number(amountPaid)} step="0.01" value={amountToPaid} onChange={e => setAmountToPaid(e.target.value)} />
          </div>

          <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
            <button type="button" className="btn btn-secondary ml-4" onClick={closeViewModal}>Cancel</button>
            <button type="submit" className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={(purchase as any)?.isDeleted || totalPayment - Number(amountPaid) < Number(amountToPaid) || purchase?.amountDue === '0' || updatePaymentMutation.isPending}>
              {updatePaymentMutation.isPending ? 'Updating...' : 'Update Purchase'}
            </button>
          </div>
          
          </form>
      </Modal>

      <DataTable
        data={purchaseData?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        rowClassName={(row) => (row as any).isDeleted ? 'opacity-60 bg-red-500/5' : ''}
      />

      <Pagination
        page={page}
        totalPages={purchaseData?.totalPages ?? 1}
        total={purchaseData?.total}
        pageSize={purchaseData?.pageSize}
        onPageChange={setPage}
      />

      <Modal isOpen={isModalOpen} onClose={closeModal} title="New Purchase" size="lg">
        <datalist id="category-suggestions">
          {existingCategories.map(cat => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  onClick={() => setIsCreatingSupplier(true)}
                >
                  <Plus size={14} /> New Supplier
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  autoFocus
                  required
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-md px-3 py-2 text-sm text-white transition-colors custom-scrollbar"
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                
              </div>
            </div>
            <FormField disabled label="Payment Type" as="select" value={paymentType} onChange={e => setPaymentType(e.target.value as PurchaseType)}>
              <option value="CREDIT">Credit</option>
              <option value="PAID">Full Payment (Paid)</option>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Amount Paid (Rs.)" type="number" required min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
            {paymentType === 'CREDIT' ? (
              <FormField label="Due Date" type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
            ) : (
              <FormField label="Due Date (Optional)" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            )}
          </div>
          
          <div className="mt-6 border-t border-[var(--color-border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-semibold text-white text-base">Line Items</h3>
                <p className="text-xs text-[var(--color-text-muted)]">Select existing items or add custom items (goes to inventory)</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5" 
                  onClick={handleAddLineItem}
                >
                  Add From Inventory
                </button>
                <button 
                  type="button" 
                  className="btn text-xs py-1.5 px-3 flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40" 
                  onClick={handleAddCustomLineItem}
                >
                  Add Custom Item
                </button>
              </div>
            </div>
            
            {lineItems.length === 0 ? (
              <div className="text-center py-6 px-4 bg-[var(--color-bg-secondary)] rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] text-sm">
                No items added yet. Click &quot;Add From Inventory&quot; or &quot;Add Custom Item&quot; above.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar p-1">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] space-y-2.5 transition-all">
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[var(--color-border)]/50">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--color-text-secondary)]">#{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleCustom(item.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                            item.isCustom
                              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30'
                              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                          }`}
                          title="Click to switch between Existing Inventory and Custom item"
                        >
                          {item.isCustom ? (
                            <>
                              Custom / New Item
                            </>
                          ) : (
                            <>
                              Existing Inventory
                            </>
                          )}
                        </button>
                        {item.isCustom && (
                          <span className="text-[11px] text-[var(--color-text-muted)] italic">
                            (Will be added to inventory)
                          </span>
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {item.isCustom ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-[var(--color-text-secondary)] mb-1 block">Item Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Brake Pads Shimano"
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              value={item.name}
                              onChange={e => handleLineItemChange(item.id, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-[var(--color-text-secondary)] mb-1 block">Category</label>
                            <input
                              type="text"
                              list="category-suggestions"
                              placeholder="e.g. Parts, Oil, Accessories"
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              value={item.category}
                              onChange={e => handleLineItemChange(item.id, 'category', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                          <div>
                            <label className="text-[11px] text-[var(--color-text-secondary)] mb-1 block">Qty *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="1"
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              value={item.quantity || ''}
                              onChange={e => handleLineItemChange(item.id, 'quantity', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-[var(--color-text-secondary)] mb-1 block">Unit Cost (Rs.) *</label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              value={item.unitCost || ''}
                              onChange={e => {
                                const cost = Number(e.target.value)
                                setLineItems(prev => prev.map(i => {
                                  if (i.id !== item.id) return i
                                  const autoSelling = (i.sellingPrice === 0 || i.sellingPrice === i.unitCost) ? cost : i.sellingPrice
                                  return { ...i, unitCost: cost, sellingPrice: autoSelling }
                                }))
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-[var(--color-text-secondary)] mb-1 block">Selling Price (Rs.)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={item.unitCost ? `${item.unitCost}` : '0.00'}
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              value={item.sellingPrice || ''}
                              onChange={e => handleLineItemChange(item.id, 'sellingPrice', Number(e.target.value))}
                            />
                          </div>
                          <div className="text-right pb-1 px-1">
                            <div className="text-[10px] text-[var(--color-text-muted)]">Subtotal</div>
                            <div className="text-sm font-semibold text-[var(--color-accent)]">
                              Rs. {((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <div className="flex-1 w-full">
                          <select 
                            required
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white  focus:outline-none"
                            value={item.itemId} 
                            onChange={e => {
                              if (e.target.value === '__NEW_CUSTOM__') {
                                handleToggleCustom(item.id)
                              } else {
                                handleLineItemChange(item.id, 'itemId', e.target.value)
                              }
                            }}
                          >
                            <option value="">Select inventory item...</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>{i.name} {i.category ? `(${i.category})` : ''}</option>
                            ))}
                            <option value="__NEW_CUSTOM__">+ Create New Custom Item...</option>
                          </select>
                        </div>
                        <div className="flex gap-2 items-center w-full sm:w-auto">
                          <div className="w-20">
                            <input 
                              type="number" required min="1" placeholder="Qty"
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                              value={item.quantity || ''} 
                              onChange={e => handleLineItemChange(item.id, 'quantity', Number(e.target.value))}
                            />
                          </div>
                          <div className="w-28">
                            <input 
                              type="number" required min="0" step="0.01" placeholder="Cost"
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                              value={item.unitCost || ''} 
                              onChange={e => handleLineItemChange(item.id, 'unitCost', Number(e.target.value))}
                            />
                          </div>
                          <div className="w-28 flex items-center justify-end px-2 text-sm font-semibold text-[var(--color-accent)]">
                            Rs. {((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
            {Number(amountPaid) > Number(total) && (
              <div className="text-md text-red-500 ">Invalid paid amount and total</div>
            )}
            <div className="text-right">
              <div className="text-xs text-[var(--color-text-secondary)]">Total Amount</div>
              <div className="text-xl font-bold text-[var(--color-accent)]">Rs. {total.toFixed(2)}</div>
            </div>
            <button type="button" className="btn btn-secondary ml-4" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || lineItems.length === 0 || Number(amountPaid) > Number(total)}>
              {createMutation.isPending ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </Modal>

      {/* New Supplier Quick Modal */}
      <Modal
        isOpen={isCreatingSupplier}
        onClose={() => {
          setIsCreatingSupplier(false)
          setNewSupplierName('')
          setNewSupplierContact('')
        }}
        title="Add New Supplier"
        size="sm"
        zIndex={60}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newSupplierName.trim()) {
              createSupplierMutation.mutate({
                name: newSupplierName.trim(),
                contact: newSupplierContact.trim() || undefined
              })
            }
          }}
          className="space-y-4"
        >
          <FormField
            label="Supplier Name"
            type="text"
            required
            autoFocus
            placeholder="e.g. Auto Zone Distributors"
            value={newSupplierName}
            onChange={e => setNewSupplierName(e.target.value)}
          />
          <FormField
            label="Contact Info / Phone (Optional)"
            type="text"
            placeholder="e.g. 0771234567"
            value={newSupplierContact}
            onChange={e => setNewSupplierContact(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsCreatingSupplier(false)
                setNewSupplierName('')
                setNewSupplierContact('')
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createSupplierMutation.isPending || !newSupplierName.trim()}
            >
              {createSupplierMutation.isPending ? 'Adding...' : 'Save & Select Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {messageDialog && (
        <MessageDialog
          isOpen={true}
          onClose={() => setMessageDialog(null)}
          type={messageDialog.type}
          title={messageDialog.title}
          message={messageDialog.message}
        />
      )}
    </div>
  )
}
