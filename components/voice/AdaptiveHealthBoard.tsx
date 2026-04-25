'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, ComposedChart, AreaChart,
  Line, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  Domain, PatientSnapshot, DOMAINS, DEFAULT_SNAPSHOT,
  buildSparkline, buildDetailChart,
} from './domainConfig'

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:        '#F7F8F6',
  card:      '#FFFFFF',
  border:    '#E8E8E4',
  gridLine:  '#EFEFEB',
  blue:      '#4472B8',
  sage:      '#5C7A5C',
  amber:     '#9D7A3E',
  rose:      '#9E4848',
  textDark:  '#1A1A1A',
  textMid:   '#5C5C5C',
  textMuted: '#9A9A96',
  shadow:    '0 1px 4px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.04)',
} as const

const STATUS: Record<string, string> = {
  good: C.sage, borderline: C.amber, elevated: C.rose,
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const visible = payload.filter((p: any) => p.value != null && p.stroke && p.stroke !== 'none')
  if (!visible.length) return null
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '8px 12px', boxShadow: C.shadow, minWidth: 120,
    }}>
      <p style={{
        fontSize: 9, color: C.textMuted, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5,
      }}>{label}</p>
      {visible.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: C.textMid }}>{p.name}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: p.stroke }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

interface AdaptiveHealthBoardProps {
  domain:              Domain
  snapshot:            PatientSnapshot | null
  isActivelySpeaking?: boolean
  fullText?:           string
}

export function AdaptiveHealthBoard({
  domain, snapshot, isActivelySpeaking = false, fullText = '',
}: AdaptiveHealthBoardProps) {
  const snap = snapshot ?? DEFAULT_SNAPSHOT
  const def  = DOMAINS[domain]

  const [stage,        setStage]        = useState(0)
  const [selectedSim,  setSelectedSim]  = useState<string | null>(null)
  const [showFullText, setShowFullText] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 400)
    const t2 = setTimeout(() => setStage(2), 1200)
    const t3 = setTimeout(() => setStage(3), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const mainCard = def.cards[0]
  const metrics  = def.cards.slice(0, 3)

  const projectionData    = useMemo(() => buildSparkline(mainCard.id, snap),  [mainCard.id, snap])
  const appliedSet        = useMemo(() => selectedSim ? new Set([selectedSim]) : new Set<string>(), [selectedSim])
  const simData           = useMemo(
    () => buildDetailChart(mainCard.id, snap, appliedSet, mainCard.simulations),
    [mainCard.id, snap, appliedSet, mainCard.simulations],
  )

  const mainVal          = mainCard.getValue(snap)
  const selectedScenario = mainCard.simulations.find(s => s.id === selectedSim)

  const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 10 } as const,
    animate:    { opacity: 1, y: 0  } as const,
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as any },
  })

  return (
    <div style={{
      background: C.bg,
      borderRadius: 20,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginTop: 8,
    }}>

      {/* ── Domain label ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
        {isActivelySpeaking ? (
          <div style={{ display: 'flex', gap: 2.5, alignItems: 'center', height: 12 }}>
            {[0, 1, 2].map(j => (
              <span key={j} style={{
                width: 2.5, height: 10, borderRadius: 2, background: C.blue,
                display: 'inline-block',
                animation: 'speakBar 1s ease-in-out infinite',
                animationDelay: `${j * 0.15}s`,
              }} />
            ))}
          </div>
        ) : (
          <div style={{ width: 2.5, height: 13, borderRadius: 2, background: C.blue, flexShrink: 0 }} />
        )}
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: C.textMuted,
        }}>
          {def.label}
        </span>
      </div>

      {/* ── ROW 1 — Bento: Trajectory chart + Key insight ────────────────────── */}
      <AnimatePresence>
        {stage >= 1 && (
          <motion.div key="row1" {...fadeUp(0)} style={{
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            gap: 10,
            alignItems: 'stretch',
          }}>

            {/* Left — Trajectory chart */}
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 18, padding: '16px 16px 12px',
              boxShadow: C.shadow,
            }}>
              <div style={{ marginBottom: 10 }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, color: C.textMuted,
                  letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3,
                }}>
                  10-Year Trajectory
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.textDark }}>
                  {mainCard.label}
                </p>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 14, height: 1.5, background: C.blue, borderRadius: 1 }} />
                  <span style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.04em' }}>Current path</span>
                </div>
                {selectedSim && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <svg width="14" height="3" style={{ flexShrink: 0 }}>
                      <line x1="0" y1="1.5" x2="14" y2="1.5" stroke={C.sage} strokeWidth="1.5" strokeDasharray="4 2" />
                    </svg>
                    <span style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.04em' }}>With change</span>
                  </motion.div>
                )}
              </div>

              <div style={{ height: 148 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={simData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="1 5" stroke={C.gridLine} vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.border, strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="current" stroke="none"
                      fill={C.blue} fillOpacity={0.06} isAnimationActive animationDuration={900} />
                    <Line type="monotone" dataKey="current" name="Current"
                      stroke={C.blue} strokeWidth={2}
                      dot={{ r: 2.5, fill: C.blue, strokeWidth: 0 }}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      isAnimationActive animationDuration={900} />
                    {selectedSim && (
                      <Line type="monotone" dataKey="improved" name="With change"
                        stroke={C.sage} strokeWidth={2} strokeDasharray="6 3"
                        dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                        isAnimationActive animationDuration={700} animationBegin={150} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right — Key insight */}
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 18, padding: '16px 14px',
              boxShadow: C.shadow,
              display: 'flex', flexDirection: 'column',
            }}>
              <p style={{
                fontSize: 9, fontWeight: 700, color: C.textMuted,
                letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Current
              </p>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.textDark, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {mainVal.display}
              </div>
              <div style={{ fontSize: 10, fontWeight: 500, color: STATUS[mainVal.status], marginTop: 5 }}>
                {mainVal.statusLabel}
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 12 }}>
                <p style={{ fontSize: 10, color: C.textMid, lineHeight: 1.6 }}>
                  {mainCard.getExplanation(snap).split('. ')[0]}.
                </p>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROW 2 — Biomarker strip ───────────────────────────────────────────── */}
      <AnimatePresence>
        {stage >= 2 && (
          <motion.div key="row2" {...fadeUp(0)} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 18, overflow: 'hidden',
            boxShadow: C.shadow,
          }}>
            {metrics.map((card, i) => {
              const val   = card.getValue(snap)
              const spark = buildSparkline(card.id, snap)
              return (
                <motion.div
                  key={card.id}
                  {...fadeUp(i * 0.08)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 72px',
                    alignItems: 'center',
                    gap: 8,
                    padding: '13px 16px',
                    borderBottom: i < metrics.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  <div>
                    <p style={{
                      fontSize: 9, fontWeight: 700, color: C.textMuted,
                      letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2,
                    }}>
                      {card.label}
                    </p>
                    <p style={{ fontSize: 19, fontWeight: 700, color: C.textDark, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                      {val.display}
                    </p>
                    <p style={{ fontSize: 10, fontWeight: 500, color: STATUS[val.status], marginTop: 2 }}>
                      {val.statusLabel}
                    </p>
                  </div>

                  <div style={{ height: 42 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={spark} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <Area type="monotone" dataKey="v"
                          stroke={STATUS[val.status]} strokeWidth={1.5}
                          fill={STATUS[val.status]} fillOpacity={0.08}
                          dot={false} isAnimationActive animationDuration={700} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROW 3 — Simulation panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {stage >= 3 && (
          <motion.div key="row3" {...fadeUp(0)} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 18, padding: '16px 16px 14px',
            boxShadow: C.shadow,
          }}>
            <p style={{
              fontSize: 9, fontWeight: 700, color: C.textMuted,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3,
            }}>
              What-If Simulation
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.textDark, marginBottom: 14 }}>
              Model an intervention
            </p>

            {/* Scenario chips */}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
              {mainCard.simulations.map(sim => {
                const active = selectedSim === sim.id
                return (
                  <button
                    key={sim.id}
                    onClick={() => setSelectedSim(prev => prev === sim.id ? null : sim.id)}
                    style={{
                      padding: '6px 13px', borderRadius: 20, cursor: 'pointer',
                      border: active ? `1.5px solid ${C.blue}` : `1px solid ${C.border}`,
                      background: active ? `rgba(68,114,184,0.07)` : '#FAFAF8',
                      color: active ? C.blue : C.textMid,
                      fontSize: 11, fontWeight: active ? 600 : 400,
                      letterSpacing: '0.01em',
                      transition: 'all 0.18s ease', fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  >
                    {sim.label}
                  </button>
                )
              })}
            </div>

            {/* Impact note — expands when scenario is selected */}
            <AnimatePresence>
              {selectedScenario && (
                <motion.div
                  key={selectedScenario.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  style={{ overflow: 'hidden', marginBottom: 14 }}
                >
                  <div style={{
                    padding: '10px 14px',
                    background: '#F4F8F4',
                    border: `1px solid #D4E4D4`,
                    borderRadius: 12,
                    display: 'flex', alignItems: 'baseline', gap: 6,
                    flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: C.sage, letterSpacing: '-0.01em' }}>
                      −{selectedScenario.riskReduction}%
                    </span>
                    <span style={{ fontSize: 11, color: C.textMid, lineHeight: 1.5 }}>
                      estimated risk reduction · {selectedScenario.note}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comparison chart */}
            <div style={{ height: 116 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="1 5" stroke={C.gridLine} vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.border, strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="current" name="Without change"
                    stroke="#C4C4BE" strokeWidth={1.5}
                    dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                    isAnimationActive animationDuration={600} />
                  {selectedSim && (
                    <Line type="monotone" dataKey="improved" name="With change"
                      stroke={C.sage} strokeWidth={2} strokeDasharray="5 3"
                      dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                      isAnimationActive animationDuration={600} animationBegin={120} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full explanation ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isActivelySpeaking && fullText && (
          <motion.div
            key="fulltext"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.4 }}
          >
            <button
              onClick={() => setShowFullText(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                fontSize: 10, color: C.textMuted, fontWeight: 500, fontFamily: 'inherit',
                letterSpacing: '0.04em',
              }}
            >
              <span style={{
                display: 'inline-block', fontSize: 8,
                transform: showFullText ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}>▶</span>
              {showFullText ? 'Hide explanation' : 'Read full explanation'}
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
                    marginTop: 8, padding: '12px 16px',
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    fontSize: 12, color: C.textMid, lineHeight: 1.75,
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
        @keyframes speakBar {
          0%, 100% { transform: scaleY(0.35); opacity: 0.4; }
          50%       { transform: scaleY(1.1);  opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
