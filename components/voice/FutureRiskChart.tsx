'use client'

import { motion } from 'framer-motion'
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts'

export interface RiskTrajectoryPoint {
  year: string
  current: number
  improved?: number
}

interface FutureRiskChartProps {
  trajectory: RiskTrajectoryPoint[]
  projectedRisk10y: number
  improvedRisk10y: number
  showImproved: boolean
}

function getRiskLevel(v: number): { label: string; color: string } {
  if (v < 10) return { label: 'Low cardiovascular risk', color: '#059669' }
  if (v < 20) return { label: 'Moderate risk — action warranted', color: '#d97706' }
  return { label: 'High risk — intervention needed', color: '#dc2626' }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const primaryPayload = payload.find((p: any) => p.dataKey === 'current')
  const improvedPayload = payload.find((p: any) => p.dataKey === 'improved')
  const riskInfo = primaryPayload ? getRiskLevel(primaryPayload.value) : null

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
      {primaryPayload && (
        <div style={{ marginBottom: improvedPayload ? 8 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#6B7280' }}>Current path</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>{primaryPayload.value}%</span>
          </div>
          {riskInfo && (
            <p style={{ fontSize: 10, color: riskInfo.color, marginTop: 3, fontWeight: 500 }}>{riskInfo.label}</p>
          )}
        </div>
      )}
      {improvedPayload && (
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 7, marginTop: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#6B7280' }}>With intervention</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>{improvedPayload.value}%</span>
          </div>
          {primaryPayload && (
            <p style={{ fontSize: 10, color: '#10b981', marginTop: 3, fontWeight: 500 }}>
              −{(primaryPayload.value - improvedPayload.value).toFixed(1)}% reduction
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function FutureRiskChart({
  trajectory, projectedRisk10y, improvedRisk10y, showImproved
}: FutureRiskChartProps) {
  const allValues = trajectory.flatMap(d => [d.current, d.improved ?? d.current])
  const yMin = Math.max(0, Math.floor(Math.min(...allValues) * 0.8))
  const yMax = Math.ceil(Math.max(...allValues) * 1.2)

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
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trajectory} margin={{ top: 8, right: 52, left: -12, bottom: 0 }}>
            {/* Clinical zone bands — rendered first so lines appear on top */}
            <ReferenceArea y1={yMin} y2={Math.min(10, yMax)} fill="#10b981" fillOpacity={0.07} stroke="none" />
            <ReferenceArea y1={Math.max(10, yMin)} y2={Math.min(20, yMax)} fill="#f59e0b" fillOpacity={0.06} stroke="none" />
            {yMax > 20 && (
              <ReferenceArea y1={20} y2={yMax} fill="#ef4444" fillOpacity={0.04} stroke="none" />
            )}

            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={v => `${v}%`}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            {/* Target threshold line */}
            <ReferenceLine
              y={10}
              stroke="#10b981"
              strokeDasharray="5 3"
              strokeWidth={1.2}
              strokeOpacity={0.7}
              label={{ value: 'Target: <10%', position: 'right', fontSize: 9, fill: '#059669', dx: 6 }}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />

            {/* Subtle area fill under current trajectory */}
            <Area
              type="monotone"
              dataKey="current"
              stroke="none"
              fill="#ef4444"
              fillOpacity={0.07}
              isAnimationActive
              animationDuration={900}
            />

            {/* Current trajectory line */}
            <Line
              type="monotone"
              dataKey="current"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={900}
            />

            {/* Improved trajectory — dashed, fades in after current line is drawn */}
            {showImproved && (
              <Line
                type="monotone"
                dataKey="improved"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeDasharray="7 4"
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive
                animationDuration={700}
                animationBegin={700}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 2.5, background: '#ef4444', borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: '#64748b' }}>Current trajectory</span>
        </div>
        {showImproved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="18" height="6" style={{ flexShrink: 0 }}>
              <line x1="0" y1="3" x2="18" y2="3" stroke="#10b981" strokeWidth="2.5" strokeDasharray="7 4" />
            </svg>
            <span style={{ fontSize: 10, color: '#64748b' }}>With intervention</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 4 }}>
          {[
            { color: '#10b981', label: '<10% Low' },
            { color: '#f59e0b', label: '10–20% Moderate' },
            { color: '#ef4444', label: '>20% High' },
          ].map(z => (
            <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color, opacity: 0.55 }} />
              <span style={{ fontSize: 9, color: '#94a3b8' }}>{z.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
        Projection is illustrative and based on available patient data. Not a clinical diagnosis.
      </p>
    </motion.div>
  )
}
