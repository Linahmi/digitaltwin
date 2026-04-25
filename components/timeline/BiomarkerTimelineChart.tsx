'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea } from 'recharts'

interface BiomarkerChartProps {
  data: {
    historical: { date: string, value: number | null }[]
    predicted: { date: string, value: number | null }[]
    zones: { optimal: [number, number], borderline: [number, number], elevated: [number, number] }
  }
}

export function BiomarkerTimelineChart({ data }: BiomarkerChartProps) {
  // Merge historical and predicted into a single array for Recharts
  const allDates = Array.from(new Set([
    ...data.historical.map(d => d.date),
    ...data.predicted.map(d => d.date)
  ])).sort()

  const chartData = allDates.map(date => {
    const hist = data.historical.find(d => d.date === date)
    const pred = data.predicted.find(d => d.date === date)
    return {
      date,
      historicalValue: hist ? hist.value : null,
      predictedValue: pred ? pred.value : null
    }
  })

  // To prevent chart clipping, find domain min/max
  const values = chartData.flatMap(d => [d.historicalValue, d.predictedValue]).filter((v): v is number => v !== null)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const YDomain = [Math.floor(minVal * 0.9), Math.ceil(maxVal * 1.1)]

  return (
    <div className="w-full h-[400px]">
      <div className="flex items-center gap-6 mb-2 text-xs font-medium text-[#777]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-[2px] bg-[#3B82F6]" />
          <span>HISTORICAL</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-[2px] border-t-2 border-dashed border-[#3B82F6] opacity-50" />
          <span>PREDICTED</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
          
          <ReferenceArea y1={data.zones.optimal[0]} y2={data.zones.optimal[1]} fill="#10b98120" />
          <ReferenceArea y1={data.zones.borderline[0]} y2={data.zones.borderline[1]} fill="#f59e0b15" />
          <ReferenceArea y1={data.zones.elevated[0]} y2={data.zones.elevated[1]} fill="#ef444415" />

          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#999', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            domain={YDomain} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#999', fontSize: 12 }}
            dx={-10}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E5E5', boxShadow: 'none' }}
            itemStyle={{ color: '#1a1a1a', fontSize: '14px', fontWeight: 500 }}
            labelStyle={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}
          />

          <Line 
            type="monotone" 
            dataKey="historicalValue" 
            stroke="#3B82F6" 
            strokeWidth={2} 
            dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} 
            activeDot={{ r: 5 }} 
            isAnimationActive={false}
            name="Recorded"
          />
          
          <Line 
            type="monotone" 
            dataKey="predictedValue" 
            stroke="#3B82F6" 
            strokeWidth={2} 
            strokeDasharray="8 4" 
            dot={false} 
            opacity={0.5}
            isAnimationActive={false}
            name="Projected"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
