import { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  icon?: ReactNode
}

export function SectionCard({ title, subtitle, children, className = '', icon }: SectionCardProps) {
  return (
    <div
      className={`flex flex-col rounded-3xl overflow-hidden h-full ${className}`}
      style={{
        background: 'rgba(30, 41, 59, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium tracking-wide text-slate-200">{title}</h3>
          {subtitle && <p className="text-sm font-medium text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {icon && <div className="text-cyan-500 opacity-60">{icon}</div>}
      </div>
      <div className="p-6 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}
