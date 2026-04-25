'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import { CardDef, PatientSnapshot, buildDetailChart } from './domainConfig'

interface CardDetailPanelProps {
  card:         CardDef
  snapshot:     PatientSnapshot
  globalSims:   Set<string>         // sims already applied from previous sessions
  onApply:      (sims: Set<string>) => void
  onClose:      () => void
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <p style={{ color: '#9ca3af', marginBottom: 3 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600, margin: '1px 0' }}>
          {p.dataKey === 'current' ? 'Without change' : 'With improvement'}: {p.value}{typeof p.value === 'number' && p.value < 10 ? '%' : ''}
        </p>
      ))}
    </div>
  )
}

export function CardDetailPanel({ card, snapshot, globalSims, onApply, onClose }: CardDetailPanelProps) {
  const [selected, setSelected]       = useState<Set<string>>(new Set(globalSims))
  const [isSimulating, setIsSimulating] = useState(false)
  const [applied, setApplied]         = useState(globalSims.size > 0)

  const detailData = buildDetailChart(card.id, snapshot, selected, card.simulations)

  const projectedAt10  = detailData[5]?.current ?? 0
  const improvedAt10   = detailData[5]?.improved ?? projectedAt10
  const reduction      = projectedAt10 - improvedAt10
  const showImproved   = applied && selected.size > 0

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleApply = useCallback(() => {
    if (selected.size === 0) return
    setIsSimulating(true)
    setTimeout(() => {
      setIsSimulating(false)
      setApplied(true)
      onApply(selected)
    }, 1200)
  }, [selected, onApply])

  // Y-axis label
  const yFmt = (v: number) => v > 10 ? `${v}` : `${v}`

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        background: 'rgba(255,255,255,0.98)',
        border: `1.5px solid ${card.accent}33`,
        borderRadius: 16,
        padding: '18px 20px',
        marginTop: 8,
        boxShadow: `0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px ${card.accent}18`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{card.icon}</span>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: card.accent, marginBottom: 1 }}>
              {card.label}
            </p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>{card.getValue(snapshot).display} · {card.getValue(snapshot).statusLabel}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)',
            background: 'rgba(0,0,0,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#6b7280', lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Explanation */}
      <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.65, marginBottom: 14, padding: '10px 12px', background: `${card.accent}08`, borderRadius: 10, borderLeft: `3px solid ${card.accent}44` }}>
        {card.getExplanation(snapshot)}
      </p>

      {/* Detail chart */}
      <div style={{ height: 180, marginBottom: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={detailData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={yFmt} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 3" strokeOpacity={0.3}
              label={{ value: 'Target', position: 'right', fontSize: 9, fill: '#10b981' }} />
            <Tooltip content={<Tip />} />
            <Line type="monotone" dataKey="current" stroke="#ef4444" strokeWidth={2}
              dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 4 }}
              isAnimationActive animationDuration={600} />
            {showImproved && detailData[0]?.improved !== undefined && (
              <Line type="monotone" dataKey="improved" stroke="#10b981" strokeWidth={2}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 4 }}
                isAnimationActive animationDuration={700} animationBegin={200} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 14, height: 2, background: '#ef4444', borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: '#6b7280' }}>Current path</span>
        </div>
        {showImproved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 14, height: 2, background: '#10b981', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#6b7280' }}>Improved path</span>
          </div>
        )}
        {showImproved && reduction > 0 && (
          <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.25)' }}>
            −{reduction} at 10y
          </div>
        )}
      </div>

      {/* Simulation buttons */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>
        What-if scenarios
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 12 }}>
        {card.simulations.map(sim => {
          const active = selected.has(sim.id)
          return (
            <button
              key={sim.id}
              onClick={() => !applied && toggle(sim.id)}
              style={{
                padding: '9px 10px', borderRadius: 10, textAlign: 'left',
                border:     active ? `1.5px solid ${card.accent}88` : '1px solid rgba(0,0,0,0.08)',
                background: active ? `${card.accent}0e` : 'rgba(0,0,0,0.02)',
                cursor:     applied ? 'default' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: active ? card.accent : '#111827', marginBottom: 2 }}>
                {active ? '✓ ' : ''}{sim.label}
              </div>
              <div style={{ fontSize: 9, color: '#10b981', fontWeight: 600 }}>{sim.note}</div>
            </button>
          )
        })}
      </div>

      {/* Apply / applied state */}
      {!applied ? (
        <button
          onClick={handleApply}
          disabled={isSimulating || selected.size === 0}
          style={{
            width: '100%', padding: '10px', borderRadius: 10, fontFamily: 'inherit',
            border:      `1px solid ${card.accent}55`,
            background:  isSimulating ? `${card.accent}0a`
              : selected.size === 0 ? 'rgba(0,0,0,0.03)'
              : `${card.accent}12`,
            cursor:   (isSimulating || selected.size === 0) ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 600,
            color:    selected.size === 0 ? '#9ca3af' : card.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'all 0.2s',
          }}
        >
          {isSimulating ? (
            <>
              <span style={{ width: 12, height: 12, border: `2px solid ${card.accent}44`, borderTopColor: card.accent, borderRadius: '50%', display: 'inline-block', animation: 'dSpin 0.8s linear infinite' }} />
              Simulating trajectory…
            </>
          ) : (
            `✦ Apply ${selected.size > 0 ? `${selected.size} scenario${selected.size > 1 ? 's' : ''}` : 'scenarios'}`
          )}
        </button>
      ) : (
        <div style={{
          padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
          fontSize: 12, color: '#059669', fontWeight: 600,
        }}>
          <span>✓</span>
          <span>Trajectory updated{reduction > 0 ? ` — ${reduction} unit improvement at 10 years` : ''}</span>
        </div>
      )}

      <p style={{ fontSize: 9, color: '#d1d5db', marginTop: 8, fontStyle: 'italic' }}>
        Illustrative projection based on available patient data. Not a clinical prediction.
      </p>

      <style>{`@keyframes dSpin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
