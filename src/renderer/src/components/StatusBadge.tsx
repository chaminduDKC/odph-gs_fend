import React from 'react'

interface StatusBadgeProps {
  status: string
  type?: 'job' | 'payment' | 'bicycle' | 'attendance' | 'default'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'default' }) => {
  let badgeClass = 'badge-neutral'
  let displayStatus = status.replace('_', ' ')

  switch (status) {
    // Jobs
    case 'RECEIVED': badgeClass = 'badge-info'; break;
    case 'IN_PROGRESS': badgeClass = 'badge-warning'; break;
    case 'COMPLETED': badgeClass = 'badge-success'; break;
    case 'DELIVERED': badgeClass = 'badge-neutral'; break;
    
    // Payments
    case 'PAID': badgeClass = 'badge-success'; break;
    case 'PARTIAL': badgeClass = 'badge-warning'; break;
    case 'DUE':
    case 'CREDIT': badgeClass = 'badge-error'; break;
    
    // Bicycles
    case 'IN_STOCK': badgeClass = 'badge-info'; break;
    case 'UNDER_REPAIR': badgeClass = 'badge-warning'; break;
    case 'SOLD': badgeClass = 'badge-success'; break;
    
    // Attendance
    case 'PRESENT': badgeClass = 'badge-success'; break;
    case 'ABSENT': badgeClass = 'badge-error'; break;
    case 'HALF_DAY': badgeClass = 'badge-warning'; break;
    case 'LEAVE': badgeClass = 'badge-info'; break;
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {displayStatus}
    </span>
  )
}
