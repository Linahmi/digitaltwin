'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts'

interface BiomarkerChartProps {
  data: {
    historical: { date: string, value: number | null }[]
    predicted: { date: string, value: number | null }[]
    zones: { optimal: [number, number], borderline: [number, number], elevated: [number, number] }
    unit?: string
    targetLabel?: string
  }
}

function getZoneInterpretation(value: number, zones: BiomarkerChartProps['data']['zones']): { label: string; color: string } {
  if (value >= zones.optimal[0] && value <= zones.optimal[1]) return { label: 'Optimal range', color: '#059669' }
  if (value >= zones.borderline[0] && value <= zones.borderline[1]) return { label: 'Borderline — monitor closely', color: '#d97706' }
  return { label: 'Elevated — action recommended', color: '#dc2626' }
}

const makeTooltip = (zones: BiomarkerChartProps['data']['zones'], unit = '') =>
  ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const hist = payload.find((p: any) => p.dataKey === 'historicalValue')
    const pred = payload.find((p: any) => p.dataKey === 'predictedValue')
    const primary = hist ?? pred
    if (!primary || primary.value == null) return null

    const zoneInfo = getZoneInterpretation(primary.value, zones)

    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        minWidth: 180,
      }}>
        <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </p>
        <div style={{ marginBottom: pred && pred.value != null ? 6 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#6B7280' }}>{hist ? 'Recorded' : 'Projected'}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#3B82F6' }}>
              {primary.value}{unit ? ` ${unit}` : ''}
            </span>
          </div>
          <p style={{ fontSize: 10, color: zoneInfo.color, marginTop: 3, fontWeight: 500 }}>{zoneInfo.label}</p>
        </div>
        {pred && pred.value != null && hist && (
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 6, marginTop: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>Projected</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', opacity: 0.6 }}>
                {pred.value}{unit ? ` ${unit}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

export function BiomarkerTimelineChart({ data }: BiomarkerChartProps) {
  const allDates = Array.from(new Set([
    ...data.historical.map(d => d.date),
    ...data.predicted.map(d => d.date),
  ])).sort()

  const chartData = allDates.map(date => {
    const hist = data.historical.find(d => d.date === date)
    const pred = data.predicted.find(d => d.date === date)
    return {
      date,
      historicalValue: hist?.value ?? null,
      predictedValue: pred?.value ?? null,
    }
  })

  const values = chartData
    .flatMap(d => [d.historicalValue, d.predictedValue])
    .filter((v): v is number => v !== null)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const yDomain: [number, number] = [Math.floor(minVal * 0.9), Math.ceil(maxVal * 1.1)]

  const CustomTooltip = useMemo(() => makeTooltip(data.zones, data.unit), [data.zones, data.unit])

  return (
    <div className="w-full h-[400px]">
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 2.5, background: '#3B82F6', borderRadius: 2 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: '#777', letterSpacing: '0.04em' }}>Historical</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="6">
            <line x1="0" y1="3" x2="16" y2="3" stroke="#3B82F6" strokeWidth="2" strokeDasharray="8 4" opacity="0.5" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#777', letterSpacing: '0.04em' }}>Projected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 4 }}>
          {[
            { color: '#10b981', label: 'Optimal' },
            { color: '#f59e0b', label: 'Borderline' },
            { color: '#ef4444', label: 'Elevated' },
          ].map(z => (
            <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color, opacity: 0.5 }} />
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{z.label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 0 }}>
          {/* Clinical zone bands */}
          <ReferenceArea y1={data.zones.optimal[0]} y2={data.zones.optimal[1]} fill="#10b981" fillOpacity={0.07} stroke="none" />
          <ReferenceArea y1={data.zones.borderline[0]} y2={data.zones.borderline[1]} fill="#f59e0b" fillOpacity={0.06} stroke="none" />
          <ReferenceArea y1={data.zones.elevated[0]} y2={data.zones.elevated[1]} fill="#ef4444" fillOpacity={0.05} stroke="none" />

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />

          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} dy={10} />
          <YAxis domain={yDomain} axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} dx={-10} />

          {/* Optimal zone upper boundary as target line */}
          <ReferenceLine
            y={data.zones.optimal[1]}
            stroke="#10b981"
            strokeDasharray="5 3"
            strokeWidth={1.2}
            strokeOpacity={0.6}
            label={data.targetLabel ? {
              value: `Target: ${data.targetLabel}`,
              position: 'right',
              fontSize: 10,
              fill: '#059669',
              dx: 6,
            } : undefined}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />

          {/* Area fill under historical line */}
          <Area
            type="monotone"
            dataKey="historicalValue"
            stroke="none"
            fill="#3B82F6"
            fillOpacity={0.07}
            isAnimationActive
            animationDuration={900}
            connectNulls
          />

          {/* Historical line */}
          <Line
            type="monotone"
            dataKey="historicalValue"
            stroke="#3B82F6"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#3B82F6', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive
            animationDuration={900}
            name="Recorded"
          />

          {/* Predicted line — dashed, lighter */}
          <Line
            type="monotone"
            dataKey="predictedValue"
            stroke="#3B82F6"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            opacity={0.5}
            isAnimationActive
            animationDuration={700}
            animationBegin={700}
            name="Projected"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
