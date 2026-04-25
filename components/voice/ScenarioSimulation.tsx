'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ScenarioOption {
  id: string
  label: string
  description: string
  riskReduction: number  // percentage points off the 10y projection
}

interface ScenarioSimulationProps {
  projectedRisk10y: number
  improvedRisk10y: number
  onSimulate: () => void
  simulated: boolean
}

const SCENARIOS: ScenarioOption[] = [
  { id: 'weight', label: 'Lose 10 kg', description: 'Weight reduction reduces CV risk by lowering BP & insulin resistance', riskReduction: 5 },
  { id: 'ldl', label: 'Lower LDL to 100', description: 'Aggressive statin therapy to reach optimal LDL target', riskReduction: 7 },
  { id: 'diet', label: 'Improve diet', description: 'Mediterranean-style diet, less saturated fat, more fiber', riskReduction: 4 },
  { id: 'exercise', label: 'Exercise 3×/week', description: 'Aerobic training improves lipid profile and blood pressure', riskReduction: 5 },
]

export function ScenarioSimulation({ projectedRisk10y, improvedRisk10y, onSimulate, simulated }: ScenarioSimulationProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const toggleScenario = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSimulate = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onSimulate()
    }, 1400)
  }

  const reduction = projectedRisk10y - improvedRisk10y

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
        Simulate a healthier future
      </p>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
        Select interventions to model a new trajectory
      </p>

      {/* Scenario buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {SCENARIOS.map(scenario => {
          const isActive = selected.has(scenario.id)
          return (
            <button
              key={scenario.id}
              onClick={() => !simulated && toggleScenario(scenario.id)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 10,
                border: isActive ? '1.5px solid rgba(14,165,233,0.5)' : '1px solid #E5E5E5',
                background: isActive ? 'rgba(14,165,233,0.06)' : '#FAFAFA',
                cursor: simulated ? 'default' : 'pointer',
                transition: 'all 0.2s',
                opacity: simulated ? 0.7 : 1,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#0284c7' : '#1a1a1a', marginBottom: 2 }}>
                {isActive ? '✓ ' : ''}{scenario.label}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{scenario.description}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#10b981', marginTop: 3 }}>−{scenario.riskReduction}% risk</div>
            </button>
          )
        })}
      </div>

      {/* Simulate button */}
      <AnimatePresence mode="wait">
        {!simulated ? (
          <motion.button
            key="simulate-btn"
            onClick={handleSimulate}
            disabled={loading || selected.size === 0}
            style={{
              width: '100%',
              padding: '11px 20px',
              borderRadius: 10,
              border: '1px solid rgba(14,165,233,0.35)',
              background: loading ? 'rgba(14,165,233,0.06)' : selected.size === 0 ? 'rgba(0,0,0,0.03)' : 'rgba(14,165,233,0.1)',
              cursor: loading || selected.size === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              color: selected.size === 0 ? '#94a3b8' : '#0284c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(2,132,199,0.3)', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Simulating healthier future...
              </>
            ) : (
              `✦ Apply ${selected.size > 0 ? selected.size + ' intervention' + (selected.size > 1 ? 's' : '') : 'interventions'}`
            )}
          </motion.button>
        ) : (
          <motion.div
            key="success-msg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: '#059669', marginBottom: 2 }}>
              ✓ Healthier trajectory applied
            </p>
            <p style={{ fontSize: 12, color: '#475569' }}>
              Projected 10-year risk reduced from <strong>{projectedRisk10y}%</strong> to <strong>{improvedRisk10y}%</strong> — a {reduction} point improvement.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
