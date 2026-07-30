import React from 'react'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  label: string
  error?: string
  as?: 'input' | 'select' | 'textarea'
  children?: React.ReactNode
}

export const FormField: React.FC<FormFieldProps> = ({ 
  label, error, as = 'input', children, className = '', ...props 
}) => {
  const Component = as as any
  
  return (
    <div className={`flex flex-col mb-4 ${className}`}>
      <label className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
      </label>
      <Component 
        {...props} 
        className={`w-full bg-[var(--color-bg-secondary)] border ${error ? 'border-red-500' : 'border-[var(--color-border)]'} focus:border-[var(--color-accent)] rounded-md px-3 py-2 text-sm text-white transition-colors custom-scrollbar`}
      >
        {children}
      </Component>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  )
}
