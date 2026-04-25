export interface Medication {
  name: string
  dosage: string
  frequency: string
  start_date?: string
}

interface MedicationsListProps {
  medications: Medication[]
}

export function MedicationsList({ medications }: MedicationsListProps) {
  if (!medications || medications.length === 0) return null

  return (
    <div className="flex flex-col bg-white border border-[#E5E5E5] rounded-lg h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E5E5]">
        <h3 className="text-sm font-medium text-[#1a1a1a]">Current Medications</h3>
      </div>
      
      <div className="flex flex-col overflow-y-auto">
        {medications.map((med, idx) => (
          <div 
            key={idx} 
            className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F0F0] last:border-b-0"
          >
            <div>
              <p className="text-base font-normal text-[#1a1a1a]">{med.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-normal text-[#888]">{med.dosage}</span>
                <span className="text-xs font-normal text-[#E5E5E5]">•</span>
                <span className="text-xs font-normal text-[#888]">{med.frequency}</span>
              </div>
            </div>
            
            {med.start_date && (
              <div className="text-xs font-normal text-[#888] sm:text-right">
                <p>Started {med.start_date.split('T')[0]}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
