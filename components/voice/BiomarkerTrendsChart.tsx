'use client'

import { motion } from 'framer-motion'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</p>
      {payload.filter((p: any) => p.value !== null).map((p: any) => (
        <p key={p.dataKey} style={{ fontSize: 12, fontWeight: 500, color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export function BiomarkerTrendsChart({ data, ldlCurrent, bpCurrent, weightCurrent }: BiomarkerTrendsChartProps) {
  // Build insight chips from current values
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

      {/* Insight chips */}
      {insights.length > 0 && (
        <div className="flex gap-3 flex-wrap mb-4">
          {insights.map(chip => (
            <div key={chip.label} style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid #F0F0F0', borderRadius: 8, padding: '5px 10px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{chip.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: chip.color, lineHeight: 1.3 }}>{chip.value}</span>
              <span style={{ fontSize: 9, color: chip.color }}>{chip.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {ldlCurrent !== null && (
              <Line type="monotone" dataKey="ldl" name="LDL mg/dL" stroke="#ef4444" strokeWidth={2}
                dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5 }}
                isAnimationActive animationDuration={800} connectNulls={false} />
            )}
            {bpCurrent !== null && (
              <Line type="monotone" dataKey="bp" name="BP mmHg" stroke="#f59e0b" strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5 }}
                isAnimationActive animationDuration={1000} connectNulls={false} />
            )}
            {weightCurrent !== null && (
              <Line type="monotone" dataKey="weight" name="Weight kg" stroke="#8b5cf6" strokeWidth={2}
                dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5 }}
                isAnimationActive animationDuration={1200} connectNulls={false} />
            )}
          </LineChart>
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
