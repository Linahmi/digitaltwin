'use client'

import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { CardDef, PatientSnapshot, buildSparkline, CardStatus } from './domainConfig'

export type CardState = 'pending' | 'active' | 'done' | 'selected'

interface DashboardCardProps {
  card:        CardDef
  snapshot:    PatientSnapshot
  state:       CardState
  onCardClick: () => void
}

const STATUS_COLOR: Record<CardStatus, string> = {
  good:       '#10b981',
  borderline: '#f59e0b',
  elevated:   '#ef4444',
}

export function DashboardCard({ card, snapshot, state, onCardClick }: DashboardCardProps) {
  const val   = card.getValue(snapshot)
  const spark = buildSparkline(card.id, snapshot)

  const isPending  = state === 'pending'
  const isActive   = state === 'active'
  const isSelected = state === 'selected'
  const isDone     = state === 'done'

  const statusColor = STATUS_COLOR[val.status]

  return (
    <motion.div
      // Initial state: invisible (pending) or animate in (active/done)
      initial={isPending ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
      animate={{
        opacity: isPending ? 0 : 1,
        y:       0,
        scale:   isActive ? 1.04 : isSelected ? 1.02 : 1,
      }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={() => !isPending && onCardClick()}
      style={{
        background:     'rgba(255,255,255,0.96)',
        border:         isSelected
          ? `2px solid ${card.accent}`
          : isActive
          ? `1.5px solid ${card.accent}`
          : '1px solid rgba(0,0,0,0.07)',
        borderRadius:   16,
        padding:        '14px 16px',
        cursor:         isPending ? 'default' : 'pointer',
        boxShadow:      isActive || isSelected
          ? `0 8px 28px ${card.accent}22, 0 2px 8px rgba(0,0,0,0.06)`
          : '0 2px 10px rgba(0,0,0,0.05)',
        position:       'relative',
        overflow:       'hidden',
        minHeight:      150,
        transition:     'border 0.3s, box-shadow 0.3s',
        userSelect:     'none',
      }}
    >
      {/* Left accent stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width:      isActive || isSelected ? 3 : 2,
        background: `linear-gradient(180deg, ${card.accent}, ${card.accent}55)`,
        borderRadius: '16px 0 0 16px',
        transition: 'width 0.3s',
      }} />

      <div style={{ paddingLeft: 6 }}>
        {/* Icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <span style={{ fontSize: 14 }}>{card.icon}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#9ca3af' }}>
            {card.label}
          </span>
        </div>

        {/* Main value */}
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1.1, marginBottom: 5, letterSpacing: '-0.02em' }}>
          {val.display}
        </div>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 20,
          background: `${statusColor}14`,
          border: `1px solid ${statusColor}28`,
          marginBottom: 8,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 600, color: statusColor }}>{val.statusLabel}</span>
        </div>

        {/* Sparkline — only shown when card is revealed */}
        {!isPending && (
          <div style={{ height: 44, marginTop: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark.map(p => ({ v: p.v }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={card.accent} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={card.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone" dataKey="v"
                  stroke={card.accent} strokeWidth={1.5}
                  fill={`url(#grad-${card.id})`}
                  dot={false} isAnimationActive={isActive}
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* "Click to explore" hint on done cards */}
      {(isDone || isSelected) && (
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontSize: 8, color: isSelected ? card.accent : '#d1d5db',
          fontWeight: 500, letterSpacing: '0.05em',
          transition: 'color 0.3s',
        }}>
          {isSelected ? 'Exploring ↓' : 'Tap to explore'}
        </div>
      )}
    </motion.div>
  )
}
