'use client'

import { motion } from 'framer-motion'
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'

export interface BiomarkerPoint {
  year: string
  ldl: number | null
  bp: number | null
  weight: number | null
}

interface BiomarkerTrendsChartProps {
  data: BiomarkerPoint[]
  ldlCurrent: number | null
  bpCurrent: number | null
  weightCurrent: number | null
}

function getLDLInterpretation(v: number) {
  if (v >= 160) return 'High — statin therapy range'
  if (v >= 130) return 'Borderline — lifestyle changes needed'
  return 'Optimal'
}

function getBPInterpretation(v: number) {
  if (v >= 140) return 'Stage 2 hypertension'
  if (v >= 130) return 'Stage 1 hypertension'
  return 'Normal'
}

function getWeightInterpretation(v: number) {
  if (v >= 95) return 'High — metabolic strain risk'
  if (v >= 85) return 'Elevated — management indicated'
  return 'Within range'
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const visible = payload.filter((p: any) =>
    p.value !== null && p.stroke && p.stroke !== 'none'
  )
  if (!visible.length) return null

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      minWidth: 190,
    }}>
      <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </p>
      {visible.map((p: any) => {
        const v = p.value as number
        let interp = ''
        if (p.dataKey === 'ldl') interp = getLDLInterpretation(v)
        else if (p.dataKey === 'bp') interp = getBPInterpretation(v)
        else if (p.dataKey === 'weight') interp = getWeightInterpretation(v)
        return (
          <div key={p.dataKey} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{p.name}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: p.stroke ?? p.color }}>{v}</span>
            </div>
            {interp && (
              <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{interp}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function BiomarkerTrendsChart({ data, ldlCurrent, bpCurrent, weightCurrent }: BiomarkerTrendsChartProps) {
  const insights: { label: string; value: string; color: string; status: string }[] = []
  if (ldlCurrent !== null) {
    insights.push({
      label: 'LDL',
      value: `${Math.round(ldlCurrent)} mg/dL`,
      color: ldlCurrent >= 160 ? '#ef4444' : ldlCurrent >= 130 ? '#f59e0b' : '#10b981',
      status: ldlCurrent >= 160 ? 'Elevated' : ldlCurrent >= 130 ? 'Borderline' : 'Optimal',
    })
  }
  if (bpCurrent !== null) {
    insights.push({
      label: 'Sys. BP',
      value: `${Math.round(bpCurrent)} mmHg`,
      color: bpCurrent >= 140 ? '#ef4444' : bpCurrent >= 130 ? '#f59e0b' : '#10b981',
      status: bpCurrent >= 140 ? 'Elevated' : bpCurrent >= 130 ? 'Borderline' : 'Optimal',
    })
  }
  if (weightCurrent !== null) {
    insights.push({
      label: 'Weight',
      value: `${Math.round(weightCurrent)} kg`,
      color: '#f59e0b',
      status: 'Trending ↑',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(14,165,233,0.18)',
        borderRadius: 16,
        padding: '18px 22px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0284c7', marginBottom: 2 }}>
        Biomarker Trends
      </p>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Projected evolution of key risk factors</p>

      {/* Status chips */}
      {insights.length > 0 && (
        <div className="flex gap-3 flex-wrap mb-4">
          {insights.map(chip => (
            <div key={chip.label} style={{
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid #F0F0F0',
              borderRadius: 8,
              padding: '5px 10px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{chip.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: chip.color, lineHeight: 1.3 }}>{chip.value}</span>
              <span style={{ fontSize: 9, color: chip.color }}>{chip.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />

            {/* LDL borderline threshold */}
            {ldlCurrent !== null && (
              <ReferenceLine y={130} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.35}
                label={{ value: 'LDL 130', position: 'right', fontSize: 9, fill: '#ef4444', fillOpacity: 0.55, dx: 4 }} />
            )}

            {/* Area fills — rendered before lines so lines appear on top */}
            {ldlCurrent !== null && (
              <Area type="monotone" dataKey="ldl" stroke="none" fill="#ef4444" fillOpacity={0.06}
                isAnimationActive animationDuration={800} connectNulls />
            )}
            {bpCurrent !== null && (
              <Area type="monotone" dataKey="bp" stroke="none" fill="#f59e0b" fillOpacity={0.06}
                isAnimationActive animationDuration={1000} connectNulls />
            )}
            {weightCurrent !== null && (
              <Area type="monotone" dataKey="weight" stroke="none" fill="#8b5cf6" fillOpacity={0.06}
                isAnimationActive animationDuration={1200} connectNulls />
            )}

            {/* Primary lines */}
            {ldlCurrent !== null && (
              <Line type="monotone" dataKey="ldl" name="LDL mg/dL" stroke="#ef4444" strokeWidth={2.5}
                dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive animationDuration={800} connectNulls={false} />
            )}
            {bpCurrent !== null && (
              <Line type="monotone" dataKey="bp" name="BP mmHg" stroke="#f59e0b" strokeWidth={2.5}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive animationDuration={1000} connectNulls={false} />
            )}
            {weightCurrent !== null && (
              <Line type="monotone" dataKey="weight" name="Weight kg" stroke="#8b5cf6" strokeWidth={2.5}
                dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive animationDuration={1200} connectNulls={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(14,165,233,0.05)', borderRadius: 10, border: '1px solid rgba(14,165,233,0.12)' }}>
        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          Without intervention, LDL, blood pressure, and weight are all trending in unfavorable directions. This combination significantly amplifies cardiovascular risk over time.
        </p>
      </div>
    </motion.div>
  )
}
