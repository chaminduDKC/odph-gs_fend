import React from 'react'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  colorClass?: string
  trend?: string
  trendUp?: boolean
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, icon: Icon, colorClass = 'text-[var(--color-accent)]', trend, trendUp
}) => {
  return (
    <div className="glass-card rounded-xl p-5 flex flex-col hover:-translate-y-1 transition-transform duration-200 cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div className="text-[var(--color-text-secondary)] font-medium text-sm">
          {title}
        </div>
        <div className={`p-2 rounded-lg bg-current/10 ${colorClass}`}>
          <Icon size={25} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {trend && (
        <div className={`text-xs font-medium ${trendUp ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  )
}
