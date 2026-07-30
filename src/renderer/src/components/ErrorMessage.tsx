import React from 'react'
import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null
  
  return (
    <div className="bg-red-500/10 border border-red-500/20 text-[var(--color-error)] px-4 py-3 rounded-md flex items-center gap-3 text-sm my-4">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  )
}
