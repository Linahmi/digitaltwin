 'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

type MarkerId = 'head' | 'chest' | 'abdomen'

type Marker = {
  id: MarkerId
  top: string
  left: string
  lineTop: string
  lineHeight: string
}

interface DigitalTwinHeroProps {
  chestGlow: number
  abdomenGlow: number
  bloodPressure: string
  heartRate: string
  ldl: string
  triglycerides: string
}

const markers: Marker[] = [
  {
    id: 'head',
    top: '15.5%',
    left: '50.2%',
    lineTop: '18%',
    lineHeight: '7%',
  },
  {
    id: 'chest',
    top: '30.5%',
    left: '53.5%',
    lineTop: '33%',
    lineHeight: '10%',
  },
  {
    id: 'abdomen',
    top: '47.5%',
    left: '50%',
    lineTop: '50%',
    lineHeight: '9%',
  },
]

export function DigitalTwinHero({
  chestGlow,
  abdomenGlow,
  bloodPressure,
  heartRate,
  ldl,
  triglycerides,
}: DigitalTwinHeroProps) {
  const [activeMarker, setActiveMarker] = useState<MarkerId>('chest')
  const [imageReady, setImageReady] = useState(false)

  const markerDetails = useMemo(
    () => ({
      head: {
        title: 'Neurovascular',
        value: bloodPressure,
        unit: 'mmHg',
      },
      chest: {
        title: 'Cardiac core',
        value: heartRate,
        unit: 'bpm',
      },
      abdomen: {
        title: 'Metabolic',
        value: `${triglycerides} / ${ldl}`,
        unit: 'TG / LDL',
      },
    }),
    [bloodPressure, heartRate, ldl, triglycerides]
  )

  const selected = markerDetails[activeMarker]

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(214,233,255,0.58),rgba(236,244,252,0.26)_24%,rgba(243,247,251,0.03)_48%,transparent_76%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-[49%] rounded-full bg-[radial-gradient(circle,rgba(173,211,255,0.22),rgba(224,238,255,0.1)_32%,rgba(240,247,252,0.015)_54%,transparent_76%)] blur-[10px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-[43%] rounded-full border border-sky-200/14" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[486px] w-[486px] -translate-x-1/2 -translate-y-[39%] rounded-full border border-sky-100/10" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[414px] w-[414px] -translate-x-1/2 -translate-y-[35%] rounded-full border border-white/14" />

      <div
        className="pointer-events-none absolute left-1/2 top-[31%] h-32 w-32 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,208,128,0.42),rgba(248,146,60,0.18)_46%,rgba(248,146,60,0)_78%)] blur-2xl"
        style={{ opacity: chestGlow / 100 }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[48%] h-36 w-36 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,210,120,0.22),rgba(248,146,60,0.08)_46%,rgba(248,146,60,0)_78%)] blur-2xl"
        style={{ opacity: abdomenGlow / 100 }}
      />

      <div className="pointer-events-none absolute inset-0 z-[1]">
        {markers.map((marker) => (
          <div
            key={marker.id}
            className="absolute w-px -translate-x-1/2 bg-gradient-to-b from-sky-300/30 via-sky-200/18 to-transparent"
            style={{ left: marker.left, top: marker.lineTop, height: marker.lineHeight }}
          />
        ))}
      </div>

      <div className="relative z-[2] flex h-full w-full items-center justify-center bg-transparent py-3">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[18%] bg-[linear-gradient(to_right,#f6f9fc_0%,rgba(246,249,252,0.9)_28%,rgba(246,249,252,0)_100%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-[18%] bg-[linear-gradient(to_left,#f6f9fc_0%,rgba(246,249,252,0.9)_28%,rgba(246,249,252,0)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[6%] bg-[linear-gradient(to_bottom,#f6f9fc_0%,rgba(246,249,252,0.7)_40%,rgba(246,249,252,0)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[6%] bg-[linear-gradient(to_top,#f6f9fc_0%,rgba(246,249,252,0.7)_40%,rgba(246,249,252,0)_100%)]" />
        <div className="relative flex h-full w-full items-center justify-center bg-transparent">
          <Image
            src="/anatomy-muscular-hero-v2.png"
            alt="Anatomical full-body digital twin"
            width={1434}
            height={2048}
            priority
            onLoad={() => setImageReady(true)}
            className={`select-none object-contain object-center mix-blend-multiply transition-opacity duration-500 ease-in-out ${
              imageReady ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              height: 'auto',
              width: 'auto',
              maxHeight: 'clamp(460px, 72vh, 860px)',
              maxWidth: '100%',
              WebkitMaskImage:
                'radial-gradient(ellipse 48% 86% at 50% 48%, black 0%, black 50%, rgba(0,0,0,0.82) 62%, rgba(0,0,0,0.35) 78%, transparent 92%)',
              maskImage:
                'radial-gradient(ellipse 48% 86% at 50% 48%, black 0%, black 50%, rgba(0,0,0,0.82) 62%, rgba(0,0,0,0.35) 78%, transparent 92%)',
              mixBlendMode: 'multiply',
              opacity: 0.94,
              filter: 'contrast(1.03) saturate(0.96) brightness(1.01)',
            }}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[3]">
        {markers.map((marker) => {
          const isActive = activeMarker === marker.id
          return (
            <div
              key={marker.id}
              className="pointer-events-auto absolute z-[4] -translate-x-1/2 -translate-y-1/2"
              style={{ top: marker.top, left: marker.left }}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveMarker(marker.id)}
                onFocus={() => setActiveMarker(marker.id)}
                onClick={() => setActiveMarker(marker.id)}
                className="relative flex items-center justify-center"
                aria-label={marker.id}
              >
                <span className="absolute h-3 w-3 animate-ping rounded-full bg-cyan-300/10" />
                <span
                  className={`absolute rounded-full border transition-all duration-200 ${
                    isActive ? 'h-3 w-3 border-cyan-300/55 bg-cyan-300/8 shadow-[0_0_12px_rgba(103,232,249,0.14)]' : 'h-2 w-2 border-sky-200/32 bg-white/14'
                  }`}
                />
                <span className="relative h-1.5 w-1.5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 shadow-[0_0_6px_rgba(56,189,248,0.18)]" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/65 bg-white/68 px-3.5 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.04)] backdrop-blur-[10px]">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{selected.title}</div>
        <div className="text-[14px] font-semibold leading-none text-slate-950">
          {selected.value}
          <span className="ml-1 text-[10px] font-medium text-slate-500">{selected.unit}</span>
        </div>
      </div>
    </div>
  )
}
