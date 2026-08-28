import { useEffect, useRef } from 'react'

/**
 * Registers an F1 keydown listener that opens the "create" modal for the current page.
 * The modal is only opened when no other overlay is already visible,
 * preventing accidental double-opens.
 *
 * @param openFn        - Callback that sets the create-modal open state to true.
 * @param isAnyModalOpen - Pass true if any overlay is already open; F1 will be suppressed.
 */
export function useF1Shortcut(openFn: () => void, isAnyModalOpen = false): void {
  const openFnRef = useRef(openFn)
  const isAnyModalOpenRef = useRef(isAnyModalOpen)

  useEffect(() => {
    openFnRef.current = openFn
    isAnyModalOpenRef.current = isAnyModalOpen
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'F1') return
      // Suppress if user is typing inside a form control
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      // Suppress when another modal / dialog is already open
      if (isAnyModalOpenRef.current) return
      e.preventDefault() // Prevent browser "Help" page
      openFnRef.current()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

