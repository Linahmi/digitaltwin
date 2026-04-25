'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'

export interface RiskTrajectoryPoint {
  year: string
  current: number
  improved?: number
}

interface FutureRiskChartProps {
  trajectory: RiskTrajectoryPoint[]
  baselineRisk: number
  projectedRisk10y: number
  improvedRisk10y: number
  showImproved: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontSize: 13, fontWeight: 500, color: p.color, margin: '2px 0' }}>
          {p.dataKey === 'current' ? 'Current path' : 'Improved path'}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  )
}

export function FutureRiskChart({
  trajectory, baselineRisk, projectedRisk10y, improvedRisk10y, showImproved
}: FutureRiskChartProps) {
  const allValues = trajectory.flatMap(d => [d.current, d.improved ?? d.current])
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const yMin = Math.max(0, Math.floor(minVal * 0.8))
  const yMax = Math.ceil(maxVal * 1.2)

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
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0284c7', marginBottom: 2 }}>
            10-Year Cardiovascular Risk
          </p>
          <p style={{ fontSize: 12, color: '#64748b' }}>Estimated trajectory based on current biomarkers</p>
        </div>
        <div style={{
          background: showImproved ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${showImproved ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: 8, padding: '4px 10px',
          fontSize: 12, fontWeight: 700,
          color: showImproved ? '#059669' : '#ef4444',
          transition: 'all 0.6s',
        }}>
          {showImproved ? `${improvedRisk10y}% ↓` : `${projectedRisk10y}% ↑`}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trajectory} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[yMin, yMax]} tickFormatter={v => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 3" strokeOpacity={0.4} label={{ value: 'Low risk', position: 'right', fontSize: 10, fill: '#10b981' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="current" stroke="#ef4444" strokeWidth={2.5}
              dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 6 }}
              isAnimationActive animationDuration={800} />
            {showImproved && (
              <Line type="monotone" dataKey="improved" stroke="#10b981" strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }}
                isAnimationActive animationDuration={900} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2">
        <div className="flex items-center gap-2">
          <div style={{ width: 18, height: 2.5, background: '#ef4444', borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: '#64748b' }}>Current trajectory</span>
        </div>
        {showImproved && (
          <div className="flex items-center gap-2">
            <div style={{ width: 18, height: 2.5, background: '#10b981', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>Improved trajectory</span>
          </div>
        )}
      </div>

      <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
        Projection is illustrative and based on available patient data. Not a clinical diagnosis.
      </p>
    </motion.div>
  )
}
