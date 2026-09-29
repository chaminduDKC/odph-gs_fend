import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Trash, RotateCcw } from 'lucide-react'
import { vehiclesApi } from '../api/vehicles'
import { customersApi } from '../api/customers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { Vehicle, Customer } from '@shared/types'
import { isAxiosError } from 'axios'
import { MessageDialog } from '@renderer/components/MessageDialog'
import { useF1Shortcut } from '../hooks/useF1Shortcut'

export const VehiclesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showDeleted, setShowDeleted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [messageDialog, setMessageDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')

  useF1Shortcut(() => {
    setEditingVehicle(null)
    setRegNumber('')
    setMake('')
    setModel('')
    setCustomerId('')
    setIsModalOpen(true)
  }, isModalOpen || isCustomerModalOpen || !!deleteId || !!restoreId || !!permanentDeleteId || !!messageDialog)

  // Form State
  const [regNumber, setRegNumber] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [customerId, setCustomerId] = useState('')

  useEffect(() => {
    setPage(1)
  }, [search, showDeleted])

  const { data: vehicleData, isLoading } = useQuery({
    queryKey: ['vehicles', search, page, showDeleted],
    queryFn: () => vehiclesApi.listVehicles(search, page, 12, showDeleted)
  })

  useEffect(() => {
    if (vehicleData && page < vehicleData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['vehicles', search, page + 1, showDeleted],
        queryFn: () => vehiclesApi.listVehicles(search, page + 1, 12, showDeleted)
      })
    }
  }, [vehicleData, page, search, showDeleted, queryClient])

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => (await customersApi.listCustomers(undefined, 1, 1000)).data
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingVehicle 
      ? vehiclesApi.updateVehicle(editingVehicle.id, data)
      : vehiclesApi.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      closeModal()
    },
    onError(error:unknown){
      closeModal()
      if(isAxiosError(error)){
        console.log(error.response?.data)
        editingVehicle ?
        setMessageDialog({ type: 'error', title: 'Cannot Update', message: error.response?.data.message })
        :
        setMessageDialog({ type: 'error', title: 'Cannot Create', message: error.response?.data.message })

      }
    }
  })

  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setDeleteId(null)
    },
    onError(error:unknown){
      setDeleteId(null)
      if(isAxiosError(error)){
        console.log(error.response?.data)
        setMessageDialog({ type: 'error', title: 'Cannot Delete', message: error.response?.data.message })

      }
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.restoreVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setRestoreId(null)
      setMessageDialog({ type: 'success', title: 'Restored', message: 'Vehicle restored successfully.' })
    },
    onError: (error: unknown) => {
      setRestoreId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Restore', message: error.response?.data.message || 'Failed to restore vehicle' })
      }
    }
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.permanentDeleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setPermanentDeleteId(null)
      setMessageDialog({ type: 'success', title: 'Permanently Deleted', message: 'Vehicle permanently deleted.' })
    },
    onError: (error: unknown) => {
      setPermanentDeleteId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Delete Permanently', message: error.response?.data.message || 'Failed to permanently delete vehicle' })
      }
    }
  })

  const createCustomerMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; address?: string }) =>
      customersApi.createCustomer(data),
    onSuccess: (newCustomer) => {
      queryClient.setQueryData<Customer[]>(['customers', 'all'], (old) => {
        return old ? [newCustomer, ...old] : [newCustomer]
      })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setCustomerId(newCustomer.id)
      closeCustomerModal()
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        console.log(error.response?.data)
        setMessageDialog({
          type: 'error',
          title: 'Cannot Create Customer',
          message: error.response?.data?.message || 'Failed to create customer'
        })
      }
    }
  })

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setRegNumber(vehicle.regNumber)
    setMake(vehicle.make)
    setModel(vehicle.model)
    setCustomerId(vehicle.customerId)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isCustomerModalOpen) return
    setIsModalOpen(false)
    setEditingVehicle(null)
    setRegNumber('')
    setMake('')
    setModel('')
    setCustomerId('')
  }

  const closeCustomerModal = () => {
    setIsCustomerModalOpen(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewCustomerAddress('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({ regNumber, make, model, customerId })
  }

  const columns: Column<Vehicle>[] = [
    { header: 'Reg Number', accessorKey: 'regNumber' },
    { header: 'Make', accessorKey: 'make' },
    { header: 'Model', accessorKey: 'model' },
    { header: 'Owner', accessorFn: (row) => row.customer?.name || '-' },
    {
      header: 'Status',
      cell: ({ row }) => (row as any).isDeleted
        ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400">Deleted</span>
        : null
    },
    {
      header: 'Actions',
      cell: ({ row }) => (row as any).isDeleted ? (
        <div className="flex gap-2">
          <button 
            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20" 
            onClick={() => setRestoreId(row.id)}
            title="Restore Vehicle"
          >
            <RotateCcw size={16} />
          </button>
          <button 
            className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20" 
            onClick={() => setPermanentDeleteId(row.id)}
            title="Delete Permanently"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="p-1.5 bg-amber-500/10 text-amber-500 rounded hover:bg-amber-500/20" onClick={() => handleEdit(row)}>
            <Edit size={16} />
          </button>
          <button className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20" onClick={() => setDeleteId(row.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Vehicles" 
        action={
          <div className="flex gap-2 items-center">
            <button
              className={`btn ${showDeleted ? 'btn-danger' : 'btn-secondary'} flex items-center gap-2`}
              onClick={() => { setShowDeleted(v => !v); setPage(1) }}
            >
              <Trash size={16} />
              {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
            </button>
            {!showDeleted && (
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> Add Vehicle
              </button>
            )}
          </div>
        }
      />

      {showDeleted && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <Trash size={14} />
          Showing deleted vehicles. These records are soft-deleted and no longer active.
        </div>
      )}

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by Reg No or Owner..." />
      </div>

      <DataTable
        data={vehicleData?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        rowClassName={(row) => (row as any).isDeleted ? 'opacity-60 bg-red-500/5' : ''}
      />

      <Pagination
        page={page}
        totalPages={vehicleData?.totalPages ?? 1}
        total={vehicleData?.total}
        pageSize={vehicleData?.pageSize}
        onPageChange={setPage}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField autoFocus label="Registration Number" required value={regNumber} onChange={e => setRegNumber(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Make (e.g. Toyota)" required value={make} onChange={e => setMake(e.target.value)} />
            <FormField label="Model (e.g. Corolla)" required value={model} onChange={e => setModel(e.target.value)} />
          </div>
          <div className="flex flex-col mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Owner (Customer) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                onClick={() => setIsCustomerModalOpen(true)}
              >
                <Plus size={14} /> New Customer
              </button>
            </div>
            <div className="flex gap-2">
              <select
                required
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-md px-3 py-2 text-sm text-white transition-colors custom-scrollbar"
              >
                <option value="">Select an owner...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
              
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending || !regNumber.trim() || !make.trim() || !model.trim() || !customerId}>
              {saveMutation.isPending ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Customer Quick Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={closeCustomerModal}
        title="Add New Customer"
        size="md"
        zIndex={60}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newCustomerName.trim() && newCustomerPhone.trim()) {
              createCustomerMutation.mutate({
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim(),
                address: newCustomerAddress.trim() || undefined
              })
            }
          }}
          className="space-y-4"
        >
          <FormField
            autoFocus
            label="Full Name"
            required
            placeholder="e.g. John Doe"
            value={newCustomerName}
            onChange={e => setNewCustomerName(e.target.value)}
          />
          <FormField
            label="Phone Number"
            type="number"
            required
            placeholder="e.g. 0771234567"
            value={newCustomerPhone}
            onChange={e => setNewCustomerPhone(e.target.value)}
          />
          <FormField
            label="Address"
            as="textarea"
            rows={3}
            placeholder="e.g. 123 Main St, Colombo (Optional)"
            value={newCustomerAddress}
            onChange={e => setNewCustomerAddress(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeCustomerModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                createCustomerMutation.isPending ||
                !newCustomerName.trim() ||
                newCustomerPhone.trim().length < 9
              }
            >
              {createCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
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

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? This record will be soft-deleted."
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
        title="Restore Vehicle"
        message="Are you sure you want to restore this vehicle? This record will become active again."
        isLoading={restoreMutation.isPending}
        confirmLabel="Restore"
        confirmVariant="success"
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteId}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
        title="Delete Vehicle Permanently"
        message="Are you sure you want to permanently delete this vehicle from the database? This action CANNOT be undone."
        isLoading={permanentDeleteMutation.isPending}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />
    </div>
  )
}
