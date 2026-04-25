import { ReactNode } from 'react'

interface InsightsCardProps {
  title: string
  value: string
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
}

export function InsightsCard({ title, value, trend, trendDirection, icon }: InsightsCardProps) {
  let trendColor = 'text-slate-400'
  if (trendDirection === 'up') trendColor = 'text-rose-400'
  else if (trendDirection === 'down') trendColor = 'text-emerald-400'

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5 transition-all duration-300"
      style={{
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className="text-cyan-500 opacity-80">{icon}</div>
      </div>
      <div>
        <span className="text-2xl font-semibold tracking-tight text-white">{value}</span>
      </div>
      {trend && (
        <div className={`text-xs font-medium tracking-wide ${trendColor}`}>
          {trend}
        </div>
      )}
    </div>
  )
}
