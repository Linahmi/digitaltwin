'use client'

import { motion } from 'framer-motion'
import { SimOption } from './domainConfig'

interface WhatIfSuggestionsProps {
  sims:         SimOption[]
  selected:     Set<string>
  onToggle:     (id: string) => void
  onSimulate:   () => void
  isSimulating: boolean
  hasSimulated: boolean
}

export function WhatIfSuggestions({
  sims, selected, onToggle, onSimulate, isSimulating, hasSimulated,
}: WhatIfSuggestionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{
        background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(14,165,233,0.18)',
        borderRadius: 16, padding: '16px 18px',
        backdropFilter: 'blur(12px)', marginTop: 10,
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0284c7', marginBottom: 2 }}>
        What-If Simulation
      </p>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
        Select interventions to model a healthier 10-year trajectory
      </p>

      {/* 2×2 grid of sim buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {sims.map((sim, i) => {
          const active = selected.has(sim.id)
          return (
            <motion.button
              key={sim.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              onClick={() => !hasSimulated && onToggle(sim.id)}
              style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                border:      active ? '1.5px solid rgba(14,165,233,0.5)' : '1px solid rgba(0,0,0,0.08)',
                background:  active ? 'rgba(14,165,233,0.07)' : 'rgba(0,0,0,0.02)',
                cursor:      hasSimulated ? 'default' : 'pointer',
                transition:  'all 0.2s',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: active ? '#0284c7' : '#1a1a1a', marginBottom: 2 }}>
                {active ? '✓ ' : ''}{sim.label}
              </div>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>{sim.note}</div>
            </motion.button>
          )
        })}
      </div>

      {/* Simulate button / success state */}
      {!hasSimulated ? (
        <button
          onClick={onSimulate}
          disabled={isSimulating || selected.size === 0}
          style={{
            width: '100%', padding: '11px',
            borderRadius: 10,
            border:      '1px solid rgba(14,165,233,0.4)',
            background:  isSimulating ? 'rgba(14,165,233,0.06)'
              : selected.size === 0   ? 'rgba(0,0,0,0.03)'
              :                         'rgba(14,165,233,0.10)',
            cursor:   (isSimulating || selected.size === 0) ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
            color:    selected.size === 0 ? '#94a3b8' : '#0284c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          {isSimulating ? (
            <>
              <span style={{
                width: 13, height: 13,
                border: '2px solid rgba(2,132,199,0.3)', borderTopColor: '#0284c7',
                borderRadius: '50%', display: 'inline-block',
                animation: 'adaptiveSpin 0.8s linear infinite',
              }} />
              Simulating healthier trajectory...
            </>
          ) : (
            `✦ Apply ${selected.size > 0 ? `${selected.size} intervention${selected.size > 1 ? 's' : ''}` : 'interventions'}`
          )}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
            fontSize: 12, color: '#059669', fontWeight: 600,
          }}
        >
          ✓ Improved trajectory applied — see the graph below
        </motion.div>
      )}

      <style>{`@keyframes adaptiveSpin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
