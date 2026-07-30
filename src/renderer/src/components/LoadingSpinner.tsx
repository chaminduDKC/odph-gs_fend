import React from 'react'

export const LoadingSpinner: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin"></div>
      <span className="text-sm font-medium text-[var(--color-text-secondary)] tracking-wider">LOADING</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg-primary)] z-50">
        {spinner}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  )
}
