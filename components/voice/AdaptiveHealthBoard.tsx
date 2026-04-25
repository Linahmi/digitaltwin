'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, ComposedChart,
  Line, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceArea, ReferenceLine,
} from 'recharts'
import {
  Domain, PatientSnapshot, DEFAULT_SNAPSHOT,
  getBoardConfigForDomain,
} from './domainConfig'

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:        '#F6FBFF',
  card:      '#FFFFFF',
  border:    '#E5E7EB',
  gridLine:  '#F0F2F4',
  blue:      '#4472B8',
  sage:      '#5C7A5C',
  amber:     '#9D7A3E',
  rose:      '#9E4848',
  textDark:  '#111827',
  textMid:   '#4B5563',
  textMuted: '#9CA3AF',
  shadow:    '0 1px 3px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04)',
} as const

// ── Tooltips ───────────────────────────────────────────────────────────────────

const TrajectoryTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const lines = payload.filter((p: any) => p.value != null && p.stroke && p.stroke !== 'none')
  if (!lines.length) return null
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '8px 12px', boxShadow: C.shadow, minWidth: 140,
    }}>
      <p style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      {lines.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: C.textMid }}>{p.name}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: p.stroke }}>{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

const BiomarkerTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const lines = payload.filter((p: any) => p.value != null)
  if (!lines.length) return null
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '8px 12px', boxShadow: C.shadow, minWidth: 140,
    }}>
      <p style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      {lines.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: C.textMid }}>{p.name}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: p.stroke || C.blue }}>{p.value}</span>
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
  const snap   = snapshot ?? DEFAULT_SNAPSHOT
  const config = useMemo(() => getBoardConfigForDomain(domain, snap), [domain, snap])

  const [stage,        setStage]        = useState(0)
  const [selectedSim,  setSelectedSim]  = useState<string | null>(null)
  const [showFullText, setShowFullText] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 400)    // Section 1 — Overview
    const t2 = setTimeout(() => setStage(2), 1600)   // Section 2 — Causal Drivers
    const t3 = setTimeout(() => setStage(3), 2800)   // Section 3 — Biomarker Trends
    const t4 = setTimeout(() => setStage(4), 4200)   // Section 4 — Simulation
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  // Trajectory with optional improved line when a scenario is selected
  const simTrajectory = useMemo(() => {
    const scenario = config.simulations.find(s => s.id === selectedSim)
    if (!scenario) return config.trajectory
    const n = config.trajectory.length - 1
    const isDecreasing = config.trajectory[5].current < config.baselineRisk
    return config.trajectory.map((point, i) => ({
      ...point,
      improved: isDecreasing
        // medication domain: already declining; improved declines faster
        ? Math.max(Math.round(point.current - scenario.riskReduction * (i / n)), 3)
        // all other domains: risk rising; improved levels off
        : Math.max(
            Math.round(
              config.baselineRisk +
              (Math.max(config.baselineRisk - scenario.riskReduction, 3) - config.baselineRisk) *
              (i / n)
            ),
            3
          ),
    }))
  }, [selectedSim, config])

  const selectedScenario = config.simulations.find(s => s.id === selectedSim)

  // Top 3 interventions ranked by impact
  const sortedSimulations = useMemo(
    () => [...config.simulations].sort((a, b) => b.riskReduction - a.riskReduction).slice(0, 3),
    [config.simulations]
  )

  // Endpoint of the improved trajectory (last point)
  const improvedEndpoint = selectedSim
    ? ((simTrajectory[simTrajectory.length - 1] as any).improved ?? config.projectedRisk10y)
    : config.projectedRisk10y

  const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 12 } as const,
    animate:    { opacity: 1, y: 0  } as const,
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as any },
  })

  // Y-axis domain for the trajectory chart
  const yVals = simTrajectory.flatMap(d => [d.current, (d as any).improved ?? d.current])
  const yMin  = Math.max(0, Math.floor(Math.min(...yVals) * 0.85))
  const yMax  = Math.ceil(Math.max(...yVals) * 1.15)

  return (
    <div style={{
      background: C.bg, borderRadius: 20, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8,
    }}>

      {/* Domain label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
        {isActivelySpeaking ? (
          <div style={{ display: 'flex', gap: 2.5, alignItems: 'center', height: 12 }}>
            {[0, 1, 2].map(j => (
              <span key={j} style={{
                width: 2.5, height: 10, borderRadius: 2, background: C.blue, display: 'inline-block',
                animation: 'speakBar 1s ease-in-out infinite', animationDelay: `${j * 0.15}s`,
              }} />
            ))}
          </div>
        ) : (
          <div style={{ width: 2.5, height: 13, borderRadius: 2, background: C.blue, flexShrink: 0 }} />
        )}
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textMuted }}>
          {config.domainLabel}
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — OVERVIEW: FUTURE TRAJECTORY
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {stage >= 1 && (
          <motion.div key="s1" {...fadeUp(0)} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 18, padding: '16px 16px 12px', boxShadow: C.shadow,
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
                  {config.mainMetricLabel}
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: C.textDark, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {config.baselineRisk}%
                  <span style={{ fontSize: 11, fontWeight: 400, color: C.textMuted, marginLeft: 6 }}>today</span>
                </p>
                <p style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                  Projected: <span style={{ color: C.rose, fontWeight: 600 }}>{config.projectedRisk10y}% in 10 years</span>
                  {selectedScenario && (
                    <span style={{ color: C.sage, fontWeight: 600 }}>
                      {' '}→ {Math.max(config.baselineRisk - selectedScenario.riskReduction, 3)}% with change
                    </span>
                  )}
                </p>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 1.5, background: C.rose, borderRadius: 1 }} />
                  <span style={{ fontSize: 9, color: C.textMuted }}>Current path</span>
                </div>
                {selectedSim && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke={C.sage} strokeWidth="1.5" strokeDasharray="4 2" /></svg>
                    <span style={{ fontSize: 9, color: C.textMuted }}>With change</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trajectory chart with clinical zone bands */}
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simTrajectory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  {/* Clinical zone bands */}
                  <ReferenceArea y1={config.riskZones.low[0]}      y2={config.riskZones.low[1]}      fill={C.sage}  fillOpacity={0.06} stroke="none" />
                  <ReferenceArea y1={config.riskZones.moderate[0]}  y2={config.riskZones.moderate[1]}  fill={C.amber} fillOpacity={0.06} stroke="none" />
                  <ReferenceArea y1={config.riskZones.high[0]}      y2={yMax}                          fill={C.rose}  fillOpacity={0.04} stroke="none" />

                  <CartesianGrid strokeDasharray="1 5" stroke={C.gridLine} vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[yMin, yMax]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fill: C.textMuted, fontSize: 9 }}
                    axisLine={false} tickLine={false}
                  />

                  {/* Threshold line at low/moderate boundary */}
                  <ReferenceLine
                    y={config.riskZones.low[1]}
                    stroke={C.sage} strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.6}
                    label={{ value: `Target <${config.riskZones.low[1]}%`, position: 'right', fontSize: 8, fill: C.sage, dx: 4 }}
                  />

                  <Tooltip content={<TrajectoryTooltip />} cursor={{ stroke: C.border, strokeWidth: 1 }} />

                  {/* Area fill under current trajectory */}
                  <Area type="monotone" dataKey="current" stroke="none"
                    fill={C.rose} fillOpacity={0.06} isAnimationActive animationDuration={900} />

                  {/* Current trajectory */}
                  <Line type="monotone" dataKey="current" name="Current path"
                    stroke={C.rose} strokeWidth={2}
                    dot={{ r: 2.5, fill: C.rose, strokeWidth: 0 }}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive animationDuration={900} />

                  {/* Improved trajectory (simulation active) */}
                  {selectedSim && (
                    <Line type="monotone" dataKey="improved" name="With change"
                      stroke={C.sage} strokeWidth={2} strokeDasharray="6 3"
                      dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                      isAnimationActive animationDuration={700} animationBegin={150} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Zone legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {[
                { color: C.sage,  label: `Low  <${config.riskZones.low[1]}%` },
                { color: C.amber, label: `Moderate ${config.riskZones.moderate[0]}–${config.riskZones.moderate[1]}%` },
                { color: C.rose,  label: `High >${config.riskZones.high[0]}%` },
              ].map(z => (
                <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 1.5, background: z.color, opacity: 0.6 }} />
                  <span style={{ fontSize: 9, color: C.textMuted }}>{z.label}</span>
                </div>
              ))}
            </div>

            {/* Clinical insight */}
            <p style={{
              fontSize: 11, color: C.textMid, lineHeight: 1.65, marginTop: 10,
              padding: '8px 12px', background: '#F9FAFB', borderRadius: 10,
              borderLeft: `2px solid ${C.border}`,
            }}>
              {config.insight}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — CAUSAL DRIVERS
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {stage >= 2 && (
          <motion.div key="s2" {...fadeUp(0)} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 18, padding: '16px 18px', boxShadow: C.shadow,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
              What is driving your risk
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.textDark, marginBottom: 14 }}>
              Relative contribution of each factor
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {config.drivers.map((driver, i) => {
                const barColor = driver.weight >= 35 ? C.rose : driver.weight >= 25 ? C.amber : C.blue
                return (
                  <motion.div
                    key={driver.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: C.textDark, minWidth: 120, flexShrink: 0 }}>
                        {driver.label}
                      </span>
                      <span style={{ fontSize: 10, color: C.textMuted, flex: 1 }}>
                        {driver.value}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 32, textAlign: 'right' }}>
                        {driver.weight}%
                      </span>
                    </div>
                    <div style={{ height: 5, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${driver.weight}%` }}
                        transition={{ duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', background: barColor, borderRadius: 3, opacity: 0.75 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — BIOMARKER TRENDS
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {stage >= 3 && (
          <motion.div key="s3" {...fadeUp(0)} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 18, padding: '16px 16px 12px', boxShadow: C.shadow,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
              Key Biomarker Trends
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.textDark, marginBottom: 10 }}>
              10-year projection without intervention
            </p>

            {/* Series legend */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
              {config.biomarkerSeries.map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 14, height: 1.5, background: s.color, borderRadius: 1 }} />
                  <span style={{ fontSize: 9, color: C.textMuted }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={config.biomarkerTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="1 5" stroke={C.gridLine} vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BiomarkerTooltip />} cursor={{ stroke: C.border, strokeWidth: 1 }} />
                  {config.biomarkerSeries.map((s, i) => (
                    <Line key={s.key}
                      type="monotone" dataKey={s.key} name={s.label}
                      stroke={s.color} strokeWidth={2}
                      dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      isAnimationActive animationDuration={800 + i * 150}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p style={{
              fontSize: 11, color: C.textMid, lineHeight: 1.65, marginTop: 10,
              padding: '8px 12px', background: '#F9FAFB', borderRadius: 10,
              borderLeft: `2px solid ${C.border}`,
            }}>
              {config.trendInsight}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — SIMULATION
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.div key="s4" {...fadeUp(0)} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 18, padding: '16px 18px 14px', boxShadow: C.shadow,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
              What changes your future
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.textDark, marginBottom: 14 }}>
              Most impactful actions — select one to simulate
            </p>

            {/* Top 3 ranked interventions, sorted by impact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 14 }}>
              {sortedSimulations.map((sim, rank) => {
                const active = selectedSim === sim.id
                const rankColor = rank === 0 ? C.rose : rank === 1 ? C.amber : C.blue
                return (
                  <button
                    key={sim.id}
                    onClick={() => setSelectedSim(prev => prev === sim.id ? null : sim.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: active ? `1px solid ${C.sage}40` : '1px solid transparent',
                      background: active ? '#F4F8F4' : 'transparent',
                      transition: 'all 0.15s', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Rank badge */}
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                        color: active ? rankColor : C.textMuted,
                        minWidth: 20, flexShrink: 0, transition: 'color 0.15s',
                      }}>#{rank + 1}</span>
                      {/* Radio dot */}
                      <div style={{
                        width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                        border: active ? `4px solid ${C.sage}` : `1.5px solid ${C.border}`,
                        transition: 'all 0.18s',
                      }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? C.textDark : C.textMid }}>
                          {sim.label}
                        </p>
                        <p style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{sim.note}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: active ? C.sage : C.textMuted,
                      whiteSpace: 'nowrap', marginLeft: 8,
                    }}>
                      −{sim.riskReduction}%
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Comparison block + Why this works — animated on selection */}
            <AnimatePresence>
              {selectedScenario && (
                <motion.div
                  key={selectedScenario.id + '_detail'}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  {/* ── Risk comparison ─────────────────────────── */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 1, marginBottom: 12,
                    background: '#F9FAFB', border: `1px solid ${C.border}`, borderRadius: 12,
                    overflow: 'hidden',
                  }}>
                    {[
                      { label: 'Current 10y', value: `${config.projectedRisk10y}%`, color: C.rose },
                      { label: 'With change', value: `${improvedEndpoint}%`,          color: C.sage },
                      { label: 'Difference',  value: `−${config.projectedRisk10y - improvedEndpoint}%`, color: C.sage, large: true },
                    ].map(cell => (
                      <div key={cell.label} style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <p style={{ fontSize: 9, color: C.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                          {cell.label}
                        </p>
                        <p style={{ fontSize: cell.large ? 20 : 15, fontWeight: 700, color: cell.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {cell.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* ── Why this works ──────────────────────────── */}
                  <div style={{
                    padding: '10px 12px', marginBottom: 12,
                    background: '#F4F8F4', border: `1px solid #D4E4D4`, borderRadius: 10,
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: C.sage, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>
                      Why this works
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {selectedScenario.why.map((bullet, i) => (
                        <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                          <span style={{ color: C.sage, fontSize: 10, flexShrink: 0, marginTop: 1 }}>·</span>
                          <p style={{ fontSize: 11, color: C.textMid, lineHeight: 1.55, margin: 0 }}>{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dual-trajectory comparison chart */}
            <div style={{ marginBottom: 6 }}>
              {/* Chart legend */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 14, height: 1.5, background: '#C4C4BE', borderRadius: 1 }} />
                  <span style={{ fontSize: 9, color: C.textMuted }}>Without change</span>
                </div>
                {selectedSim && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <svg width="14" height="3"><line x1="0" y1="1.5" x2="14" y2="1.5" stroke={C.sage} strokeWidth="1.5" strokeDasharray="4 2" /></svg>
                    <span style={{ fontSize: 9, color: C.sage, fontWeight: 600 }}>With {selectedScenario?.label.toLowerCase()}</span>
                  </motion.div>
                )}
              </div>
              <div style={{ height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={simTrajectory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="1 5" stroke={C.gridLine} vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TrajectoryTooltip />} cursor={{ stroke: C.border, strokeWidth: 1 }} />
                    {/* Current trajectory — always visible, grey */}
                    <Line type="monotone" dataKey="current" name="Without change"
                      stroke="#C4C4BE" strokeWidth={2}
                      dot={{ r: 2, fill: '#C4C4BE', strokeWidth: 0 }}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                      isAnimationActive animationDuration={700} />
                    {/* Improved trajectory — appears on selection, animated */}
                    {selectedSim && (
                      <Line type="monotone" dataKey="improved" name="With change"
                        stroke={C.sage} strokeWidth={2.5} strokeDasharray="6 3"
                        dot={{ r: 2.5, fill: C.sage, strokeWidth: 0 }}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive animationDuration={700} animationBegin={100} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full explanation toggle */}
      <AnimatePresence>
        {!isActivelySpeaking && fullText && (
          <motion.div key="fulltext"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.5 }}
          >
            <button
              onClick={() => setShowFullText(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                fontSize: 10, color: C.textMuted, fontWeight: 500, fontFamily: 'inherit',
              }}
            >
              <span style={{
                display: 'inline-block', fontSize: 8,
                transform: showFullText ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}>▶</span>
              {showFullText ? 'Hide explanation' : 'Read full explanation'}
            </button>
            <AnimatePresence>
              {showFullText && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    marginTop: 8, padding: '12px 16px',
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
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
