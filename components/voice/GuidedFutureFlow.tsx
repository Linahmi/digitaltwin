


'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FutureRiskChart, RiskTrajectoryPoint } from './FutureRiskChart'
import { BiomarkerTrendsChart, BiomarkerPoint } from './BiomarkerTrendsChart'
import { ScenarioSimulation } from './ScenarioSimulation'

export interface GuidedFutureFlowProps {
  baselineRisk: number
  projectedRisk10y: number
  improvedRisk10y: number
  trajectory: RiskTrajectoryPoint[]
  drivers: string[]
  ldlCurrent: number | null
  bpCurrent: number | null
  weightCurrent: number | null
}

/** Build a simple projected biomarker trend from current values */
function buildBiomarkerTrend(
  ldl: number | null,
  bp: number | null,
  weight: number | null
): BiomarkerPoint[] {
  const years = [0, 2, 4, 6, 8, 10]
  return years.map(y => ({
    year: y === 0 ? 'Today' : `+${y}y`,
    ldl: ldl !== null ? Math.min(Math.round(ldl + y * 2.5), 280) : null,
    bp: bp !== null ? Math.min(Math.round(bp + y * 0.8), 180) : null,
    weight: weight !== null ? Math.round(weight + y * 0.7) : null,
  }))
}

export function GuidedFutureFlow({
  baselineRisk, projectedRisk10y, improvedRisk10y, trajectory,
  drivers, ldlCurrent, bpCurrent, weightCurrent,
}: GuidedFutureFlowProps) {
  const [step, setStep] = useState(0)  // 0=none, 1=risk chart, 2=biomarkers, 3=scenarios
  const [simulated, setSimulated] = useState(false)
  const [showFinal, setShowFinal] = useState(false)

  // Timed reveal sequence
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),   // Step 2: risk chart @ 1.5s
      setTimeout(() => setStep(2), 3500),   // Step 3: biomarker trends @ 3.5s
      setTimeout(() => setStep(3), 5500),   // Step 4: scenario panel @ 5.5s
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleSimulate = () => {
    setSimulated(true)
    setTimeout(() => setShowFinal(true), 1200)
  }

  const biomarkerTrend = buildBiomarkerTrend(ldlCurrent, bpCurrent, weightCurrent)

  const driverLabel = drivers.length > 0
    ? drivers.join(', ')
    : 'LDL cholesterol, weight, and blood pressure'

  return (
    <div className="mt-3 flex flex-col gap-3">

      {/* Step 1 — Already shown as AI message; hint card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(14,165,233,0.06)',
          border: '1px solid rgba(14,165,233,0.15)',
          fontSize: 12,
          color: '#475569',
          lineHeight: 1.6,
        }}
      >
        <span style={{ fontWeight: 600, color: '#0284c7' }}>Your digital twin is analyzing your trajectory.</span>{' '}
        Primary drivers: <strong>{driverLabel}</strong>.
      </motion.div>

      {/* Step 2 — Risk Projection Chart */}
      <AnimatePresence>
        {step >= 1 && (
          <FutureRiskChart
            trajectory={trajectory}
            projectedRisk10y={projectedRisk10y}
            improvedRisk10y={improvedRisk10y}
            showImproved={simulated}
          />
        )}
      </AnimatePresence>

      {/* Step 3 — Biomarker Trends Chart */}
      <AnimatePresence>
        {step >= 2 && (
          <BiomarkerTrendsChart
            data={biomarkerTrend}
            ldlCurrent={ldlCurrent}
            bpCurrent={bpCurrent}
            weightCurrent={weightCurrent}
          />
        )}
      </AnimatePresence>

      {/* Step 4 — Scenario Simulation Panel */}
      <AnimatePresence>
        {step >= 3 && (
          <ScenarioSimulation
            projectedRisk10y={projectedRisk10y}
            improvedRisk10y={improvedRisk10y}
            onSimulate={handleSimulate}
            simulated={simulated}
          />
        )}
      </AnimatePresence>

      {/* Step 6 — Final insight line */}
      <AnimatePresence>
        {showFinal && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(16,185,129,0.06) 100%)',
              border: '1px solid rgba(14,165,233,0.2)',
              fontSize: 13,
              fontStyle: 'italic',
              color: '#334155',
              lineHeight: 1.7,
              textAlign: 'center',
            }}
          >
            "This is the core of the twin: not only predicting your future, but showing how to change it."
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
