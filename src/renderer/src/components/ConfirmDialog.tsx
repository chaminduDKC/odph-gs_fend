import React from 'react'
import { Modal } from './Modal'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  isLoading?: boolean
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary' | 'success'
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger'
}) => {
  const isRestore = confirmVariant === 'success' || confirmVariant === 'primary'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center p-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            isRestore ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
          }`}
        >
          {isRestore ? <RotateCcw size={24} /> : <AlertTriangle size={24} />}
        </div>
        <p className="text-[var(--color-text-secondary)] mb-6 text-sm">{message}</p>
        <div className="flex w-full gap-3">
          <button 
            type="button"
            className="btn btn-secondary flex-1" 
            onClick={onClose} 
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="button"
            className={`btn flex-1 ${
              confirmVariant === 'danger'
                ? 'btn-danger'
                : confirmVariant === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'btn-primary'
            }`}
            onClick={onConfirm} 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
