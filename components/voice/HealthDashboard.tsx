'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Domain, PatientSnapshot, DOMAINS, DEFAULT_SNAPSHOT } from './domainConfig'
import { DashboardCard, CardState } from './DashboardCard'
import { CardDetailPanel } from './CardDetailPanel'

interface HealthDashboardProps {
  domain:   Domain
  snapshot: PatientSnapshot | null
}

// Stage timeline from mount:
//  0 → entry hint only (grid placeholder rows visible)
//  1 @ 1 000ms → card 0 pops forward
//  2 @ 2 500ms → card 1 pops, card 0 settles
//  3 @ 4 000ms → card 2 pops, cards 0-1 settle
//  4 @ 5 500ms → card 3 pops, cards 0-2 settle
//  5 @ 7 500ms → all settled, "tap to explore" hints appear

export function HealthDashboard({ domain, snapshot }: HealthDashboardProps) {
  const snap = snapshot ?? DEFAULT_SNAPSHOT
  const def  = DOMAINS[domain]

  const [stage, setStage]               = useState(0)
  const [selectedIdx, setSelectedIdx]   = useState<number | null>(null)
  // appliedSims: cardId → Set of applied sim IDs
  const [appliedSims, setAppliedSims]   = useState<Record<string, Set<string>>>({})

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

  const handleCardClick = useCallback((idx: number) => {
    if (stage < 5) return          // don't allow clicks during narration
    setSelectedIdx(prev => prev === idx ? null : idx)
  }, [stage])

  const handleApply = useCallback((cardId: string, sims: Set<string>) => {
    setAppliedSims(prev => ({ ...prev, [cardId]: sims }))
  }, [])

  // Determine state for each card slot
  function cardState(i: number): CardState {
    if (stage < i + 1) return 'pending'
    if (selectedIdx === i) return 'selected'
    if (stage === i + 1 && selectedIdx === null) return 'active'
    return 'done'
  }

  const selectedCard = selectedIdx !== null ? def.cards[selectedIdx] : null

  return (
    <div style={{ marginTop: 10 }}>
      {/* Domain label */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        }}
      >
        <div style={{
          height: 3, width: 20, borderRadius: 2,
          background: `linear-gradient(90deg, ${def.cards[0].accent}, ${def.cards[1].accent})`,
        }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280' }}>
          {def.label}
        </span>
      </motion.div>

      {/* 2×2 card grid — always present, cards reveal one by one */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {def.cards.map((card, i) => (
          <DashboardCard
            key={card.id}
            card={card}
            snapshot={snap}
            state={cardState(i)}
            onCardClick={() => handleCardClick(i)}
          />
        ))}
      </div>

      {/* Explore hint — appears after all cards settle */}
      <AnimatePresence>
        {stage >= 5 && selectedIdx === null && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8, fontWeight: 500 }}
          >
            Tap any card to simulate changes
          </motion.p>
        )}
      </AnimatePresence>

      {/* Card detail panel — slides in below grid when a card is selected */}
      <AnimatePresence mode="wait">
        {selectedCard && selectedIdx !== null && (
          <CardDetailPanel
            key={selectedCard.id}
            card={selectedCard}
            snapshot={snap}
            globalSims={appliedSims[selectedCard.id] ?? new Set()}
            onApply={(sims) => handleApply(selectedCard.id, sims)}
            onClose={() => setSelectedIdx(null)}
          />
        )}
      </AnimatePresence>

      {/* Applied-sims summary — shows when multiple cards have sims applied */}
      {Object.keys(appliedSims).length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 8, padding: '10px 14px', borderRadius: 12,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
            fontSize: 11, color: '#065f46', fontWeight: 500,
          }}
        >
          ✓ Changes applied to {Object.keys(appliedSims).length} areas — your combined improved trajectory is now reflected in the charts above.
        </motion.div>
      )}
    </div>
  )
}
