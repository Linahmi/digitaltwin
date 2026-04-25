'use client'

import { motion } from 'framer-motion'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import { TrajectoryPoint } from './domainConfig'

interface SimulationTimelineProps {
  trajectory:        TrajectoryPoint[]
  projectedRisk10y:  number
  improvedRisk10y:   number
  scenarioLabels:    string[]
  yLabel:            string
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#94a3b8', marginBottom: 3 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600, margin: '1px 0' }}>
          {p.dataKey === 'current' ? 'Current path' : 'Improved path'}: {p.value}%
        </p>
      ))}
    </div>
  )
}

export function SimulationTimeline({
  trajectory, projectedRisk10y, improvedRisk10y, scenarioLabels, yLabel,
}: SimulationTimelineProps) {
  const reduction = projectedRisk10y - improvedRisk10y

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(14,165,233,0.2)',
        borderRadius: 16, padding: '18px 20px',
        backdropFilter: 'blur(12px)',
        marginTop: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0284c7', marginBottom: 2 }}>
            Simulated 10-Year Trajectory
          </p>
          <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
            With: {scenarioLabels.join(' · ')}
          </p>
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          style={{
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 8, padding: '4px 10px',
            fontSize: 13, fontWeight: 700, color: '#059669',
          }}
        >
          −{reduction}% risk
        </motion.div>
      </div>

      {/* Chart */}
      <div style={{ height: 195 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trajectory} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 3" strokeOpacity={0.35}
              label={{ value: 'Target', position: 'right', fontSize: 9, fill: '#10b981' }} />
            <Tooltip content={<Tip />} />
            <Line type="monotone" dataKey="current" stroke="#ef4444" strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5 }}
              isAnimationActive animationDuration={700} />
            <Line type="monotone" dataKey="improved" stroke="#10b981" strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }}
              isAnimationActive animationDuration={900} animationBegin={300} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 2.5, background: '#ef4444', borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: '#64748b' }}>Current ({projectedRisk10y}% at 10y)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 2.5, background: '#10b981', borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: '#64748b' }}>Improved ({improvedRisk10y}% at 10y)</span>
        </div>
      </div>

      <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
        Illustrative projection based on available patient data. Not a clinical prediction.
      </p>
    </motion.div>
  )
}
