'use client'

import { motion } from 'framer-motion'
import { CardStatus } from './domainConfig'

const STATUS_COLOR: Record<CardStatus, string> = {
  good:       '#10b981',
  borderline: '#f59e0b',
  elevated:   '#ef4444',
}

interface MetricInsightCardProps {
  label:       string
  display:     string
  statusLabel: string
  status:      CardStatus
  icon:        string
  accent:      string
  isActive:    boolean
  isDone:      boolean
}

export function MetricInsightCard({
  label, display, statusLabel, status, icon, accent, isActive, isDone,
}: MetricInsightCardProps) {
  const statusColor = STATUS_COLOR[status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.94 }}
      animate={{
        opacity: isActive ? 1 : isDone ? 0.88 : 1,
        scale:   isActive ? 1.04 : 1,
        y: 0,
      }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: isActive ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.82)',
        border:     `1.5px solid ${isActive ? accent : 'rgba(0,0,0,0.07)'}`,
        boxShadow:  isActive
          ? `0 8px 28px ${accent}28, 0 0 0 3px ${accent}12`
          : '0 2px 8px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Accent left stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: isActive ? 3 : 2,
        background: `linear-gradient(180deg, ${accent}, ${accent}66)`,
        borderRadius: '14px 0 0 14px',
        transition: 'width 0.3s',
      }} />

      <div style={{ paddingLeft: 8 }}>
        {/* Icon + label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>
            {label}
          </span>
        </div>

        {/* Main value */}
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.1, marginBottom: 5 }}>
          {display}
        </div>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px', borderRadius: 20,
          background: `${statusColor}18`,
          border: `1px solid ${statusColor}30`,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
        </div>
      </div>
    </motion.div>
  )
}
