'use client'

import dynamic from 'next/dynamic'

const ParticleAwakeningCanvas = dynamic(
  () => import('./ParticleAwakeningCanvas').then(m => m.ParticleAwakeningCanvas),
  { ssr: false }
)

export function ParticleAwakening() {
  return <ParticleAwakeningCanvas />
}
