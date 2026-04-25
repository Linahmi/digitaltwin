'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Domain, PatientSnapshot, DOMAINS, buildTrajectory, TrajectoryPoint } from './domainConfig'
import { MetricInsightCard } from './MetricInsightCard'
import { WhatIfSuggestions } from './WhatIfSuggestions'
import { SimulationTimeline } from './SimulationTimeline'

interface GuidedNarrationFlowProps {
  domain:   Domain
  snapshot: PatientSnapshot
}

// Stage timeline (ms from mount):
//   0 → nothing (entry hint only)
//   1 → card 0 active       @ 1 000ms
//   2 → card 1 active       @ 2 500ms
//   3 → card 2 active       @ 4 000ms
//   4 → card 3 active       @ 5 500ms
//   5 → all settled, sims   @ 7 500ms
//   6 → simulation complete

export function GuidedNarrationFlow({ domain, snapshot }: GuidedNarrationFlowProps) {
  const def = DOMAINS[domain]
  const [stage, setStage]             = useState(0)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [isSimulating, setIsSimulating] = useState(false)
  const [trajectory, setTrajectory]   = useState<TrajectoryPoint[] | null>(null)

  const baseRisk = def.getBaseRisk(snapshot)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 1000),
      setTimeout(() => setStage(2), 2500),
      setTimeout(() => setStage(3), 4000),
      setTimeout(() => setStage(4), 5500),
      setTimeout(() => setStage(5), 7500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const toggleSim = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const runSimulation = useCallback(() => {
    setIsSimulating(true)
    setTimeout(() => {
      const totalReduction = Array.from(selected)
        .reduce((sum, id) => sum + (def.sims.find(s => s.id === id)?.riskReduction ?? 0), 0)
      setTrajectory(buildTrajectory(baseRisk, totalReduction))
      setIsSimulating(false)
      setStage(6)
    }, 1500)
  }, [selected, baseRisk, def.sims])

  const baseTrajectory    = buildTrajectory(baseRisk)
  const projectedRisk10y  = baseTrajectory[5].current
  const improvedRisk10y   = trajectory?.[5].improved ?? projectedRisk10y
  const selectedSims      = def.sims.filter(s => selected.has(s.id))

  return (
    <div style={{ marginTop: 10 }}>
      {/* Domain header hint */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          padding: '8px 14px', marginBottom: 10,
          borderRadius: 10,
          background: 'rgba(14,165,233,0.06)',
          border: '1px solid rgba(14,165,233,0.15)',
          fontSize: 11, color: '#475569',
        }}
      >
        <span style={{ fontWeight: 600, color: '#0284c7' }}>{def.label}</span>
        {' '}· Analyzing your key health factors
      </motion.div>

      {/* 2×2 card grid — cards appear one by one */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        {def.cards.map((card, i) => {
          const revealed  = stage >= i + 1
          const isActive  = stage === i + 1
          const isDone    = stage > i + 1
          const val       = card.getValue(snapshot)

          if (!revealed) {
            // Placeholder slot — keeps grid shape while card hasn't appeared yet
            return (
              <div
                key={card.id}
                style={{
                  minHeight: 88,
                  borderRadius: 14,
                  background: 'rgba(0,0,0,0.02)',
                  border: '1px dashed rgba(0,0,0,0.08)',
                }}
              />
            )
          }

          return (
            <MetricInsightCard
              key={card.id}
              label={card.label}
              display={val.display}
              statusLabel={val.statusLabel}
              status={val.status}
              icon={card.icon}
              accent={card.accent}
              isActive={isActive}
              isDone={isDone}
            />
          )
        })}
      </div>

      {/* What-if simulation panel — appears after all cards settle */}
      <AnimatePresence>
        {stage >= 5 && (
          <WhatIfSuggestions
            sims={def.sims}
            selected={selected}
            onToggle={toggleSim}
            onSimulate={runSimulation}
            isSimulating={isSimulating}
            hasSimulated={trajectory !== null}
          />
        )}
      </AnimatePresence>

      {/* Simulation timeline — appears after user runs a simulation */}
      <AnimatePresence>
        {trajectory && (
          <SimulationTimeline
            trajectory={trajectory}
            yLabel={def.yLabel}
            projectedRisk10y={projectedRisk10y}
            improvedRisk10y={improvedRisk10y}
            scenarioLabels={selectedSims.map(s => s.label)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
