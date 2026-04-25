interface AIInsightCardProps {
  title: string
  metric: string
  description: string
  severity: 'optimal' | 'borderline' | 'elevated'
}

export function AIInsightCard({ title, metric, description, severity }: AIInsightCardProps) {
  let colorClass = 'text-emerald-500'
  let bgColor = 'bg-emerald-500'
  
  if (severity === 'borderline') {
    colorClass = 'text-amber-500'
    bgColor = 'bg-amber-500'
  } else if (severity === 'elevated') {
    colorClass = 'text-rose-500'
    bgColor = 'bg-rose-500'
  }

  return (
    <div className="flex flex-col gap-2 bg-white border border-[#E5E5E5] rounded-lg p-5">
      <h4 className="text-xs uppercase tracking-widest text-[#999] font-normal mb-1">{title}</h4>
      
      <span className={`text-2xl font-light ${colorClass}`}>{metric}</span>

      <p className="text-sm text-[#777] font-normal leading-relaxed pb-3 mt-1">
        {description}
      </p>

      {/* subtile ligne colorée */}
      <div className="mt-auto">
        <div className={`h-[2px] w-16 ${bgColor}`} />
      </div>
    </div>
  )
}
