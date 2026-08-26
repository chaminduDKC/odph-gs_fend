import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Trash2, Sparkles, Package } from 'lucide-react'
import { purchasesApi } from '../api/purchases'
import { suppliersApi } from '../api/suppliers'
import { inventoryApi } from '../api/inventory'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { Pagination } from '../components/Pagination'
import { PurchaseTransaction, PurchaseType } from '@shared/types'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'

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
  
  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ['purchases', page],
    queryFn: () => purchasesApi.listPurchases(page)
  })

  useEffect(() => {
    if (purchaseData && page < purchaseData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['purchases', page + 1],
        queryFn: () => purchasesApi.listPurchases(page + 1)
      })
    }
  }, [purchaseData, page, queryClient])

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
  const [lineItems, setLineItems] = useState<PurchaseLineItemState[]>([])

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
    { header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-2">
        <button className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20" onClick={()=> handleEdit(row)}>
          <Eye size={16} />
        </button>
        <button onClick={()=> setDeletingId(row.id)} className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20">
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
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Purchase
          </button>
        }
      />
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={()=> setDeletingId("")}
        onConfirm={()=> {deletingId && deleteMutation.mutate(deletingId)}}
        message='Are you sure you want to delete this Purchase record? Inventory items also will be deleted related to this Purchase'
        title='Delete Purchase'
        isLoading={deleteMutation.isPending}
       />

      <Modal isOpen={isViewOpen} onClose={closeViewModal} title='Edit Credit Details'>
        <form onSubmit={handleSubmitUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className='text-left'>
              <div className="text-xs text-[var(--color-text-secondary)]">Total Amount</div>
              <div className="text-xl font-bold text-[var(--color-accent)]">Rs. {totalPayment.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
            <div className='text-right'>
              <div className="text-xs text-[var(--color-text-secondary)]">Amount Due</div>

              {totalPayment - Number(amountPaid) <= Number(amountToPaid) ? (<p  className="text-xl font-bold text-green-500">Paid</p>) : (<p className="text-xl font-bold text-red-500">Rs. {(totalPayment - Number(amountPaid)).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>)}
              
            </div>
              
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount Paid (Rs.)" type="number" required min="0" step="0.01" value={amountPaid} disabled onChange={e => setAmountPaid(e.target.value)} />
            <FormField disabled={totalPayment - Number(amountPaid) <= Number(amountToPaid)} label="Add New Payment (Rs.)" type="number" required min="0" max={totalPayment - Number(amountPaid)} step="0.01" value={amountToPaid} onChange={e => setAmountToPaid(e.target.value)} />
          </div>

          <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
            <button type="button" className="btn btn-secondary ml-4" onClick={closeViewModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={totalPayment - Number(amountPaid) <= Number(amountToPaid) || updatePaymentMutation.isPending}>
              {updatePaymentMutation.isPending ? 'Updating...' : 'Update Purchase'}
            </button>
          </div>
          
          </form>
      </Modal>

      <DataTable data={purchaseData?.data ?? []} columns={columns} isLoading={isLoading} />

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
            <FormField autoFocus label="Supplier" as="select" required value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">Select a supplier...</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </FormField>
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
    </div>
  )
}
