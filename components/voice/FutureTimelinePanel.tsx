'use client'

import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

export interface TrajectoryPoint {
  year: string
  current: number
  improved?: number
}

export interface FutureTimelinePanelProps {
  trajectory: TrajectoryPoint[]
  baselineRisk: number
  projectedRisk10y: number
  improvedRisk10y: number
  drivers: string[]
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

export function FutureTimelinePanel({
  trajectory,
  baselineRisk,
  projectedRisk10y,
  improvedRisk10y,
  drivers,
}: FutureTimelinePanelProps) {
  const [simulated, setSimulated] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSimulate = () => {
    setLoading(true)
    setTimeout(() => {
      setSimulated(true)
      setLoading(false)
    }, 900)
  }

  // Compute Y domain dynamically
  const allValues = trajectory.flatMap(d => [d.current, d.improved ?? d.current])
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const yMin = Math.max(0, Math.floor(minVal * 0.85))
  const yMax = Math.ceil(maxVal * 1.15)

  return (
    <div
      className="mt-3 mx-auto max-w-2xl"
      style={{ animation: 'panelFadeIn 0.5s ease forwards', opacity: 0 }}
    >
      <style>{`
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          background: 'rgba(255,255,255,0.88)',
          border: '1px solid rgba(14,165,233,0.15)',
          borderRadius: 16,
          padding: '20px 24px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0284c7', marginBottom: 2 }}>
              Future Health Timeline
            </p>
            <p style={{ fontSize: 13, color: '#475569' }}>10-year cardiovascular risk projection</p>
          </div>
          <div
            style={{
              background: simulated ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${simulated ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: simulated ? '#059669' : '#ef4444',
              transition: 'all 0.5s',
            }}
          >
            {simulated ? `${improvedRisk10y}% at 10 yrs ↓` : `${projectedRisk10y}% at 10 yrs ↑`}
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={v => `${v}%`}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 3" strokeOpacity={0.35} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                animationDuration={600}
              />
              {simulated && (
                <Line
                  type="monotone"
                  dataKey="improved"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-3">
          <div className="flex items-center gap-2">
            <div style={{ width: 20, height: 2.5, background: '#ef4444', borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>Current trajectory</span>
          </div>
          {simulated && (
            <div className="flex items-center gap-2">
              <div style={{ width: 20, height: 2.5, background: '#10b981', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>Improved trajectory</span>
            </div>
          )}
        </div>

        {/* Key Drivers */}
        <div
          className="mt-4"
          style={{
            background: 'rgba(14,165,233,0.05)',
            border: '1px solid rgba(14,165,233,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0284c7', marginBottom: 4 }}>
            Key Drivers
          </p>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            {simulated
              ? `With targeted improvements to ${drivers.join(', ')}, projected risk drops from ${projectedRisk10y}% to ${improvedRisk10y}% over 10 years — a ${projectedRisk10y - improvedRisk10y} point reduction.`
              : drivers.length > 0
                ? `${drivers.join(', ')} ${drivers.length > 1 ? 'are' : 'is'} the primary driver${drivers.length > 1 ? 's' : ''} of your elevated long-term cardiovascular risk.`
                : 'Continue monitoring key biomarkers to refine this projection.'}
          </p>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
          Projection is illustrative and based on available patient data. Not a clinical diagnosis.
        </p>

        {/* CTA */}
        {!simulated && (
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2"
            style={{
              background: loading ? 'rgba(14,165,233,0.06)' : 'rgba(14,165,233,0.1)',
              border: '1px solid rgba(14,165,233,0.3)',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: '#0284c7',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(2,132,199,0.3)', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Simulating...
              </>
            ) : (
              '✦ Simulate healthier future'
            )}
          </button>
        )}

        {simulated && (
          <div className="mt-4 text-center" style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>
            ✓ Healthier trajectory applied — risk reduced by {projectedRisk10y - improvedRisk10y} percentage points at 10 years
          </div>
        )}
      </div>
    </div>
  )
}
