'use client'

import { useEffect, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

export function ParticleBackground() {
  const [init, setInit] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setInit(true))
  }, [])

  if (!init) return null

  return (
    <Particles
      id="tsparticles"
      className="absolute inset-0 -z-10"
      options={{
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        detectRetina: true,
        particles: {
          color: { value: '#06d6a0' },
          links: {
            color: '#06d6a0',
            distance: 150,
            enable: true,
            opacity: 0.12,
            width: 1,
          },
          move: {
            enable: true,
            speed: 0.6,
            direction: 'none',
            random: true,
            straight: false,
            outModes: { default: 'bounce' },
          },
          number: {
            density: { enable: true },
            value: 70,
          },
          opacity: { value: 0.25 },
          shape: { type: 'circle' },
          size: { value: { min: 1, max: 2.5 } },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'grab' },
          },
          modes: {
            grab: { distance: 160, links: { opacity: 0.25 } },
          },
        },
      }}
    />
  )
}
