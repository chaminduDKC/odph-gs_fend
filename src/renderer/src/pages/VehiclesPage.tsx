import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { vehiclesApi } from '../api/vehicles'
import { customersApi } from '../api/customers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Vehicle } from '@shared/types'

export const VehiclesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  // Form State
  const [regNumber, setRegNumber] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [customerId, setCustomerId] = useState('')

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', search],
    queryFn: () => vehiclesApi.listVehicles(search)
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.listCustomers()
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingVehicle 
      ? vehiclesApi.updateVehicle(editingVehicle.id, data)
      : vehiclesApi.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setDeleteId(null)
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
    setIsModalOpen(false)
    setEditingVehicle(null)
    setRegNumber('')
    setMake('')
    setModel('')
    setCustomerId('')
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
      header: 'Actions',
      cell: ({ row }) => (
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
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Vehicle
          </button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by Reg No or Owner..." />
      </div>

      <DataTable data={vehicles} columns={columns} isLoading={isLoading} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Registration Number" required value={regNumber} onChange={e => setRegNumber(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Make (e.g. Toyota)" required value={make} onChange={e => setMake(e.target.value)} />
            <FormField label="Model (e.g. Corolla)" required value={model} onChange={e => setModel(e.target.value)} />
          </div>
          <FormField label="Owner (Customer)" as="select" required value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">Select an owner...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
            ))}
          </FormField>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
