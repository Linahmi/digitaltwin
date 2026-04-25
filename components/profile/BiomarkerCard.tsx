import { ReactNode } from 'react'

interface BiomarkerCardProps {
  label: string
  value: string | number
  unit: string
  status: 'optimal' | 'borderline' | 'elevated' | 'monitor'
  icon?: ReactNode
  progress?: number
}

export function BiomarkerCard({ label, value, unit, status, icon, progress = 50 }: BiomarkerCardProps) {
  let statusColor = 'text-emerald-500'
  let progressColor = 'bg-emerald-500'

  if (status === 'borderline' || status === 'monitor') {
    statusColor = 'text-amber-500'
    progressColor = 'bg-amber-500'
  } else if (status === 'elevated') {
    statusColor = 'text-rose-500'
    progressColor = 'bg-rose-500'
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-white border border-[#E5E5E5] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-[#999]">{label}</span>
      </div>

      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-light text-[#1a1a1a]">{value}</span>
        {unit && <span className="text-xs font-normal text-[#999]">{unit}</span>}
      </div>

      <div className="mt-auto pt-2 flex flex-col gap-2">
        <div className="h-[2px] w-full bg-[#F0F0F0] rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${progressColor} transition-all duration-1000 ease-out`} 
            style={{ width: `${Math.max(5, Math.min(100, progress))}%` }} 
          />
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] ${statusColor}`}>●</span>
          <span className="text-[10px] font-normal uppercase tracking-widest text-[#999]">
            {status}
          </span>
        </div>
      </div>
    </div>
  )
}
