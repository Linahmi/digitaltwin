export interface Condition {
  name: string
  onset_date?: string
  status: 'active' | 'resolved' | string
}

interface ConditionsListProps {
  conditions: Condition[]
}

export function ConditionsList({ conditions }: ConditionsListProps) {
  if (!conditions || conditions.length === 0) return null

  return (
    <div className="flex flex-col bg-white border border-[#E5E5E5] rounded-lg h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E5E5]">
        <h3 className="text-xs uppercase tracking-widest text-[#999] font-normal">Active Conditions</h3>
      </div>
      
      <div className="flex flex-col overflow-y-auto">
        {conditions.map((condition, idx) => {
          const isActive = condition.status === 'active' || condition.status === 'Optimal'
          const badgeColor = isActive ? 'text-emerald-500' : 'text-[#999]'
          
          return (
            <div 
              key={idx} 
              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F0F0] last:border-b-0"
            >
              <div>
                <p className="text-base font-normal text-[#1a1a1a]">{condition.name}</p>
                {condition.onset_date && (
                  <p className="text-xs font-normal text-[#888] mt-1">Diagnosed {condition.onset_date.split('T')[0]}</p>
                )}
              </div>
              
              <div>
                <span className={`text-xs font-normal uppercase tracking-widest ${badgeColor}`}>
                  {condition.status}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
