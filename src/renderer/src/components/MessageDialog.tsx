import React from 'react'
import { Modal } from './Modal'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export type MessageDialogType = 'success' | 'error'

interface MessageDialogProps {
  isOpen: boolean
  onClose: () => void
  type: MessageDialogType
  title: string
  message: string
}

const typeConfig: Record<MessageDialogType, { icon: React.ReactNode; iconBg: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle size={24} />,
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-500',
  },
  error: {
    icon: <AlertTriangle size={24} />,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-500',
  },
}

export const MessageDialog: React.FC<MessageDialogProps> = ({
  isOpen, onClose, type, title, message
}) => {
  const { icon, iconBg, iconColor } = typeConfig[type]
  console.log("Called ft")

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center p-4">
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mb-4 ${iconColor}`}>
          {icon}
        </div>
        <p className="text-[var(--color-text-secondary)] mb-6">{message}</p>
        <div className="flex w-full">
          <button
            className="btn btn-secondary flex-1"
            onClick={onClose}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  )
}