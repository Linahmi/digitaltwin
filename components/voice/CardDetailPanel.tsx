'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea,
} from 'recharts'
import { CardDef, PatientSnapshot, buildDetailChart } from './domainConfig'

interface CardDetailPanelProps {
  card:       CardDef
  snapshot:   PatientSnapshot
  globalSims: Set<string>
  onApply:    (sims: Set<string>) => void
  onClose:    () => void
}

// ── Clinical zone config ──────────────────────────────────────────────────────

interface ZoneConfig {
  green:  [number, number]
  yellow: [number, number]
  red:    [number, number]
  domain: [number, number]
}

const ZONES: Record<string, ZoneConfig> = {
  cvRisk:       { green: [0,   10],  yellow: [10,  20],  red: [20,  55],  domain: [0,   50]  },
  ldl:          { green: [40,  100], yellow: [100, 130],  red: [130, 290], domain: [40,  250] },
  bp:           { green: [80,  120], yellow: [120, 140],  red: [140, 185], domain: [80,  175] },
  bmi:          { green: [15,  25],  yellow: [25,  30],   red: [30,  48],  domain: [15,  45]  },
  diabetesRisk: { green: [0,   15],  yellow: [15,  30],   red: [30,  75],  domain: [0,   70]  },
  glucose:      { green: [60,  100], yellow: [100, 126],  red: [126, 225], domain: [60,  220] },
  hba1c:        { green: [4,   5.7], yellow: [5.7, 6.5],  red: [6.5, 13],  domain: [4,   12]  },
  overallRisk:  { green: [0,   15],  yellow: [15,  25],   red: [25,  95],  domain: [0,   90]  },
  sleepStress:  { green: [75,  105], yellow: [50,  75],   red: [15,  50],  domain: [20,  100] },
  activityDiet: { green: [75,  105], yellow: [50,  75],   red: [15,  50],  domain: [20,  100] },
  adherence:    { green: [90,  105], yellow: [70,  90],   red: [25,  70],  domain: [30,  100] },
  biomarkers:   { green: [40,  100], yellow: [100, 130],  red: [130, 290], domain: [40,  250] },
}

// ── Clinical reference targets ────────────────────────────────────────────────

const THRESHOLD: Record<string, number> = {
  cvRisk: 10, ldl: 100, bp: 120, bmi: 25, diabetesRisk: 15,
  glucose: 100, hba1c: 5.7, overallRisk: 15,
  sleepStress: 75, activityDiet: 75, adherence: 90, biomarkers: 100,
}

const THRESHOLD_LABEL: Record<string, string> = {
  cvRisk: 'Target <10%', ldl: 'Target <100', bp: 'Target <120',
  bmi: 'Target <25', diabetesRisk: 'Target <15%',
  glucose: 'Target <100', hba1c: 'Target <5.7', overallRisk: 'Target <15%',
  sleepStress: 'Target >75', activityDiet: 'Target >75',
  adherence: 'Target >90%', biomarkers: 'Target <100',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractFirst(text: string): [string, string] {
  const idx = text.indexOf('. ')
  if (idx < 0) return [text, '']
  return [text.slice(0, idx + 1), text.slice(idx + 2).trim()]
}

const STATUS_COLOR: Record<string, string> = {
  elevated: '#B91C1C', borderline: '#B45309', good: '#047857',
}

const STATUS_TEXT: Record<string, string> = {
  elevated: '↑ Above target', borderline: '⚠ Borderline', good: '✓ Within range',
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TipProps {
  active?:  boolean
  payload?: any[]
  label?:   string
  zone?:    ZoneConfig
}

function ClinicalTipContent({ active, payload, label, zone }: TipProps) {
  if (!active || !payload?.length) return null

  const currentEntry  = payload.find((p: any) => p.dataKey === 'current')
  const improvedEntry = payload.find((p: any) => p.dataKey === 'improved')
  const val           = currentEntry?.value

  let interp      = ''
  let interpColor = '#6B7280'
  if (val !== undefined && zone) {
    if      (val >= zone.green[0]  && val <= zone.green[1])  { interp = 'Optimal range';              interpColor = '#059669' }
    else if (val >= zone.yellow[0] && val <= zone.yellow[1]) { interp = 'Borderline — monitor closely'; interpColor = '#B45309' }
    else                                                     { interp = 'Above clinical target';       interpColor = '#B91C1C' }
  }

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E5E7EB',
      borderRadius: 8, padding: '10px 14px', fontSize: 11,
      boxShadow: '0 4px 16px rgba(0,0,0,0.09)', minWidth: 136,
    }}>
      <p style={{ color: '#9CA3AF', marginBottom: 5, fontWeight: 500, fontSize: 10 }}>{label}</p>
      {val !== undefined && (
        <p style={{ color: '#111827', margin: '0 0 2px', fontWeight: 700, fontSize: 14 }}>{val}</p>
      )}
      {improvedEntry && (
        <p style={{ color: '#059669', margin: '2px 0 0', fontWeight: 500, fontSize: 11 }}>
          With intervention: {improvedEntry.value}
        </p>
      )}
      {interp && (
        <p style={{
          color: interpColor, margin: '6px 0 0', fontSize: 10,
          borderTop: '1px solid #F3F4F6', paddingTop: 5, fontWeight: 500,
        }}>
          {interp}
        </p>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.13em',
      textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8,
    }}>
      {children}
    </p>
  )
}

const Divider = () => (
  <div style={{ height: 1, background: '#E5E7EB', margin: '18px 0' }} />
)

// ── Main component ────────────────────────────────────────────────────────────

export function CardDetailPanel({ card, snapshot, globalSims, onApply, onClose }: CardDetailPanelProps) {
  const [selected, setSelected]         = useState<Set<string>>(new Set(globalSims))
  const [isSimulating, setIsSimulating] = useState(false)
  const [applied, setApplied]           = useState(globalSims.size > 0)

  const detailData    = buildDetailChart(card.id, snapshot, selected, card.simulations)
  const projectedAt10 = detailData[5]?.current ?? 0
  const improvedAt10  = detailData[5]?.improved ?? projectedAt10
  const reduction     = projectedAt10 - improvedAt10
  const showImproved  = applied && selected.size > 0

  const zone        = ZONES[card.id]
  const threshold   = THRESHOLD[card.id]
  const threshLabel = THRESHOLD_LABEL[card.id]

  const renderTooltip = useCallback(
    (props: any) => <ClinicalTipContent {...props} zone={zone} />,
    [zone],
  )

  const toggle = useCallback((id: string) => {
    if (applied) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [applied])

  const handleApply = useCallback(() => {
    if (selected.size === 0) return
    setIsSimulating(true)
    setTimeout(() => {
      setIsSimulating(false)
      setApplied(true)
      onApply(selected)
    }, 1200)
  }, [selected, onApply])

  const { display, status, statusLabel } = card.getValue(snapshot)
  const [keyInsight, interpretation]     = extractFirst(card.getExplanation(snapshot))

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        background: '#FFFFFF', border: '1px solid #E5E7EB',
        borderRadius: 10, padding: '20px 22px', marginTop: 8,
      }}
    >

      {/* ── 1. Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4, lineHeight: 1 }}>
            {card.label}
          </p>
          <span style={{ fontSize: 11, color: STATUS_COLOR[status] ?? '#6B7280', fontWeight: 500 }}>
            {STATUS_TEXT[status] ?? statusLabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1, marginBottom: 3 }}>
              {display}
            </p>
            <p style={{ fontSize: 11, color: '#6B7280' }}>{statusLabel}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 16, color: '#9CA3AF', lineHeight: 1,
              padding: '0 0 0 4px', marginTop: 1, fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        </div>
      </div>

      <Divider />

      {/* ── 2. Key insight ──────────────────────────────────────────────────── */}
      <SectionLabel>Key Insight</SectionLabel>
      <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 0 }}>
        {keyInsight}
      </p>

      <Divider />

      {/* ── 3. Premium chart ────────────────────────────────────────────────── */}
      <SectionLabel>10-Year Projection</SectionLabel>
      <div style={{ height: 184 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={detailData} margin={{ top: 6, right: 56, left: -20, bottom: 0 }}>

            {/* Clinical reference zones — rendered first (background) */}
            {zone && (
              <>
                <ReferenceArea y1={zone.green[0]}  y2={zone.green[1]}  fill="#DCFCE7" fillOpacity={0.5} strokeOpacity={0} />
                <ReferenceArea y1={zone.yellow[0]} y2={zone.yellow[1]} fill="#FEF9C3" fillOpacity={0.5} strokeOpacity={0} />
                <ReferenceArea y1={zone.red[0]}    y2={zone.red[1]}    fill="#FEE2E2" fillOpacity={0.5} strokeOpacity={0} />
              </>
            )}

            <XAxis
              dataKey="year"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              domain={zone ? zone.domain : ['auto', 'auto']}
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickCount={4}
            />

            {/* Dashed clinical target line */}
            {threshold !== undefined && (
              <ReferenceLine
                y={threshold}
                stroke="#9CA3AF"
                strokeDasharray="5 4"
                strokeWidth={1}
                label={{
                  value: threshLabel,
                  position: 'right',
                  fontSize: 9,
                  fill: '#9CA3AF',
                  dx: 4,
                }}
              />
            )}

            <Tooltip content={renderTooltip} cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }} />

            {/* Primary: current trajectory — solid line + subtle fill */}
            <Area
              type="monotone"
              dataKey="current"
              stroke="#2563EB"
              strokeWidth={2.5}
              fill="#2563EB"
              fillOpacity={0.06}
              dot={false}
              activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
              isAnimationActive
              animationDuration={600}
            />

            {/* Secondary: improved trajectory — dashed line, no fill */}
            {showImproved && detailData[0]?.improved !== undefined && (
              <Line
                type="monotone"
                dataKey="improved"
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, fill: '#059669', strokeWidth: 0 }}
                isAnimationActive
                animationDuration={800}
                animationBegin={150}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="18" height="6">
            <line x1="0" y1="3" x2="18" y2="3" stroke="#2563EB" strokeWidth="2.5" />
          </svg>
          <span style={{ fontSize: 10, color: '#6B7280' }}>Current trajectory</span>
        </div>
        {showImproved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="18" height="6">
              <line x1="0" y1="3" x2="18" y2="3" stroke="#059669" strokeWidth="2" strokeDasharray="5 4" />
            </svg>
            <span style={{ fontSize: 10, color: '#6B7280' }}>
              With intervention{reduction > 0 ? ` (−${reduction} at 10y)` : ''}
            </span>
          </div>
        )}
        {threshold !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="18" height="6">
              <line x1="0" y1="3" x2="18" y2="3" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="5 4" />
            </svg>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>Clinical target</span>
          </div>
        )}
        {zone && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {[
              { bg: '#DCFCE7', border: '#86EFAC', label: 'Optimal'    },
              { bg: '#FEF9C3', border: '#FDE047', label: 'Borderline' },
              { bg: '#FEE2E2', border: '#FCA5A5', label: 'Elevated'   },
            ].map(({ bg, border, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: bg, border: `1px solid ${border}` }} />
                <span style={{ fontSize: 9, color: '#9CA3AF' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* ── 4. Interpretation ───────────────────────────────────────────────── */}
      {interpretation && (
        <>
          <SectionLabel>Interpretation</SectionLabel>
          <p style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.65, marginBottom: 0 }}>
            {interpretation}
          </p>
          <Divider />
        </>
      )}

      {/* ── 5. Interventions (tabular list) ─────────────────────────────────── */}
      <SectionLabel>Interventions</SectionLabel>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
            <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#9CA3AF', paddingBottom: 7, fontFamily: 'inherit' }}>
              Intervention
            </th>
            <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 500, color: '#9CA3AF', paddingBottom: 7, fontFamily: 'inherit' }}>
              Expected impact
            </th>
          </tr>
        </thead>
        <tbody>
          {card.simulations.map((sim, idx) => {
            const isSelected = selected.has(sim.id)
            const isLast     = idx === card.simulations.length - 1
            return (
              <tr
                key={sim.id}
                onClick={() => !applied && toggle(sim.id)}
                style={{
                  cursor:       applied ? 'default' : 'pointer',
                  borderBottom: !isLast ? '1px solid #F9FAFB' : 'none',
                }}
              >
                <td style={{
                  padding: '9px 0', fontSize: 12,
                  color:      isSelected ? '#111827' : '#374151',
                  fontWeight: isSelected ? 600 : 400,
                  userSelect: 'none',
                }}>
                  {isSelected && (
                    <span style={{ color: '#059669', marginRight: 5, fontSize: 10 }}>✓</span>
                  )}
                  {sim.label}
                </td>
                <td style={{
                  padding: '9px 0', fontSize: 12, color: '#059669',
                  fontWeight: 500, textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums' as const,
                  userSelect: 'none',
                }}>
                  {sim.note}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── Apply / applied ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!applied ? (
          <button
            onClick={handleApply}
            disabled={isSimulating || selected.size === 0}
            style={{
              background: 'none', border: 'none', padding: 0, fontFamily: 'inherit',
              cursor:         (isSimulating || selected.size === 0) ? 'not-allowed' : 'pointer',
              fontSize:       12, fontWeight: 600,
              color:          selected.size === 0 ? '#D1D5DB' : '#111827',
              textDecoration: selected.size > 0 ? 'underline' : 'none',
              textUnderlineOffset: '2px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isSimulating ? (
              <>
                <span style={{
                  width: 10, height: 10,
                  border: '1.5px solid #E5E7EB', borderTopColor: '#374151',
                  borderRadius: '50%', display: 'inline-block',
                  animation: 'dSpin 0.8s linear infinite',
                }} />
                Simulating trajectory…
              </>
            ) : (
              `Run simulation${selected.size > 0 ? ` (${selected.size} selected)` : ''}`
            )}
          </button>
        ) : (
          <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>
            {reduction > 0
              ? `Simulation applied — ${reduction} unit improvement at 10 years`
              : 'Simulation applied'}
          </span>
        )}
      </div>

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <p style={{
        fontSize: 9, color: '#D1D5DB', marginTop: 14,
        borderTop: '1px solid #F3F4F6', paddingTop: 10,
        fontStyle: 'italic',
      }}>
        Illustrative projection based on available patient data. Not a clinical prediction.
      </p>

      <style>{`@keyframes dSpin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
