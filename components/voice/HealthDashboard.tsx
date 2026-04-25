'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Domain, PatientSnapshot, DOMAINS, DEFAULT_SNAPSHOT } from './domainConfig'
import { DashboardCard, CardState } from './DashboardCard'
import { CardDetailPanel } from './CardDetailPanel'

interface HealthDashboardProps {
  domain:               Domain
  snapshot:             PatientSnapshot | null
  isActivelySpeaking?:  boolean
  fullText?:            string
}

export function HealthDashboard({ domain, snapshot, isActivelySpeaking = false, fullText = '' }: HealthDashboardProps) {
  const snap = snapshot ?? DEFAULT_SNAPSHOT
  const def  = DOMAINS[domain]

  const [stage, setStage]               = useState(0)
  const [selectedIdx, setSelectedIdx]   = useState<number | null>(null)
  const [appliedSims, setAppliedSims]   = useState<Record<string, Set<string>>>({})
  const [showFullText, setShowFullText] = useState(false)

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
    if (stage < 5) return
    setSelectedIdx(prev => prev === idx ? null : idx)
  }, [stage])

  const handleApply = useCallback((cardId: string, sims: Set<string>) => {
    setAppliedSims(prev => ({ ...prev, [cardId]: sims }))
  }, [])

  function cardState(i: number): CardState {
    if (stage < i + 1) return 'pending'
    if (selectedIdx === i) return 'selected'
    if (stage === i + 1 && selectedIdx === null) return 'active'
    return 'done'
  }

  // Current narration caption advances with each card that pops in
  const narrationCaption =
    stage === 0 ? 'Analyzing your health data…' :
    stage <= 4  ? def.cards[stage - 1].caption :
    `${def.label} — explore the cards below`

  const selectedCard = selectedIdx !== null ? def.cards[selectedIdx] : null

  return (
    <div style={{ marginTop: 10 }}>

      {/* ── Narration strip ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(139,92,246,0.15)',
          borderRadius: 12,
          padding: '8px 14px',
          marginBottom: 12,
          minHeight: 36,
        }}
      >
        {/* Animated speaking dots while TTS active, static mark when done */}
        {isActivelySpeaking ? (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
            {[0, 1, 2].map(j => (
              <span
                key={j}
                style={{
                  width: 5, height: 5,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                  display: 'inline-block',
                  animation: 'speakDot 1.2s ease-in-out infinite',
                  animationDelay: `${j * 0.2}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <span style={{
            fontSize: 10, flexShrink: 0, lineHeight: 1,
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>✦</span>
        )}

        {/* Caption cross-fades as stage advances */}
        <AnimatePresence mode="wait">
          <motion.span
            key={narrationCaption}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 12, color: '#4b5563', fontWeight: 500, lineHeight: 1.4, flex: 1 }}
          >
            {narrationCaption}
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {/* ── Domain label ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
      >
        <div style={{
          height: 3, width: 20, borderRadius: 2,
          background: `linear-gradient(90deg, ${def.cards[0].accent}, ${def.cards[1].accent})`,
        }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280' }}>
          {def.label}
        </span>
      </motion.div>

      {/* ── 2×2 card grid ────────────────────────────────────────────────────── */}
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

      {/* Explore hint */}
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

      {/* ── Card detail panel ─────────────────────────────────────────────────── */}
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

      {/* Multi-card applied summary */}
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
          ✓ Changes applied to {Object.keys(appliedSims).length} areas — your combined improved trajectory is reflected in the charts above.
        </motion.div>
      )}

      {/* ── "View full explanation" collapsible ─────────────────────────────── */}
      {/* Hidden while TTS is speaking; appears once voice ends */}
      <AnimatePresence>
        {!isActivelySpeaking && fullText && (
          <motion.div
            key="fulltext"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            style={{ marginTop: 10 }}
          >
            <button
              onClick={() => setShowFullText(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 11, color: '#6b7280', fontWeight: 500, fontFamily: 'inherit',
              }}
            >
              <span style={{
                display: 'inline-block', fontSize: 9,
                transform: showFullText ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}>▶</span>
              {showFullText ? 'Hide full explanation' : 'View full explanation'}
            </button>

            <AnimatePresence>
              {showFullText && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    marginTop: 8, padding: '10px 14px',
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(139,92,246,0.12)',
                    borderRadius: 12,
                    fontSize: 13, color: '#374151', lineHeight: 1.65,
                  }}>
                    {fullText}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes speakDot {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50%       { transform: scaleY(1.5); opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
