import { ReactNode } from 'react'

interface VitalsCardProps {
  label: string
  value: string | number
  unit: string
  status: 'normal' | 'warning' | 'danger'
  icon?: ReactNode
}

export function VitalsCard({ label, value, unit, status, icon }: VitalsCardProps) {
  let dotColor = '#10b981' // muted green
  let glowColor = 'rgba(16, 185, 129, 0.15)'
  
  if (status === 'warning') {
    dotColor = '#fb923c' // soft orange
    glowColor = 'rgba(251, 146, 60, 0.15)'
  } else if (status === 'danger') {
    dotColor = '#f87171' // soft red
    glowColor = 'rgba(248, 113, 113, 0.15)'
  }

  return (
    <div
      className="group relative flex flex-col gap-4 rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1"
      style={{
        background: 'rgba(30, 41, 59, 0.4)', // Slate-800 with opacity
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Subtle hover gradient */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${glowColor}, transparent 70%)`
        }}
      />

      <div className="relative flex items-center justify-between">
        <span className="text-sm tracking-wide text-slate-400 font-medium">
          {label}
        </span>
        <div className="text-slate-500 group-hover:text-cyan-400 transition-colors duration-300">
          {icon}
        </div>
      </div>
      
      <div className="relative mt-1 flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight text-white group-hover:text-cyan-50 transition-colors">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-slate-500">
              {unit}
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-auto flex items-center gap-2 pt-2">
        <span
          className="h-2 w-2 rounded-full relative"
          style={{ background: dotColor, boxShadow: `0 0 10px ${dotColor}` }}
        >
          {/* Pulse effect */}
          <span className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ background: dotColor }} />
        </span>
      </div>
    </div>
  )
}
