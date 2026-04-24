'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const N = 80
const FLOAT_END = 2000
const CONVERGE_END = 4500

interface Particle {
  x: number
  y: number
  angle: number
  orbitR: number
  orbitSpeed: number
  size: number
  baseOpacity: number
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function ParticleScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let cx = window.innerWidth / 2
    let cy = window.innerHeight / 2
    let particles: Particle[] = []

    const initParticles = () => {
      cx = canvas.width / 2
      cy = canvas.height / 2
      particles = []
      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.9
        const orbitR = 180 + Math.random() * 230
        particles.push({
          x: cx + Math.cos(angle) * orbitR,
          y: cy + Math.sin(angle) * orbitR,
          angle,
          orbitR,
          orbitSpeed: (0.00015 + Math.random() * 0.0002) * (Math.random() > 0.5 ? 1 : -1),
          size: 1.2 + Math.random() * 1.4,
          baseOpacity: 0.35 + Math.random() * 0.45,
        })
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    resize()
    window.addEventListener('resize', resize)

    const startTime = Date.now()
    let raf: number

    const draw = () => {
      const elapsed = Date.now() - startTime
      const phase = elapsed < FLOAT_END ? 0 : elapsed < CONVERGE_END ? 1 : 2

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < N; i++) {
        const p = particles[i]

        if (phase === 0) {
          p.angle += p.orbitSpeed
          const tx = cx + Math.cos(p.angle) * p.orbitR
          const ty = cy + Math.sin(p.angle) * p.orbitR
          p.x += (tx - p.x) * 0.025
          p.y += (ty - p.y) * 0.025
        } else if (phase === 1) {
          const t = easeInOut((elapsed - FLOAT_END) / (CONVERGE_END - FLOAT_END))
          const spread = 36
          const tx = cx + Math.cos(p.angle) * spread * (1 - t)
          const ty = cy + Math.sin(p.angle) * spread * (1 - t)
          p.x += (tx - p.x) * 0.028
          p.y += (ty - p.y) * 0.028
        } else {
          p.x += Math.sin(elapsed * 0.001 + i * 0.73) * 0.18
          p.y += Math.cos(elapsed * 0.0009 + i * 1.1) * 0.18
          p.x += (cx - p.x) * 0.003
          p.y += (cy - p.y) * 0.003
        }

        // Connections
        const maxDist = phase === 0 ? 130 : 85
        const maxDist2 = maxDist * maxDist
        for (let j = i + 1; j < N; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < maxDist2) {
            const dist = Math.sqrt(dist2)
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(6,214,160,${0.11 * (1 - dist / maxDist)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }

        // Particle glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4.5)
        grd.addColorStop(0, `rgba(6,214,160,${p.baseOpacity})`)
        grd.addColorStop(0.35, `rgba(6,214,160,${p.baseOpacity * 0.38})`)
        grd.addColorStop(1, 'rgba(6,214,160,0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4.5, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Face silhouette — appears as particles converge */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* Halo glow behind face */}
        <motion.div
          className="absolute"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.8, duration: 2.2, ease: 'easeIn' }}
          style={{
            width: 300,
            height: 360,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(6,214,160,0.14) 0%, rgba(6,214,160,0.06) 45%, transparent 70%)',
            filter: 'blur(28px)',
          }}
        />

        {/* Face wireframe SVG */}
        <motion.svg
          width="160"
          height="200"
          viewBox="0 0 160 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4, duration: 1.8, ease: 'easeIn' }}
        >
          {/* Head outline */}
          <ellipse
            cx="80"
            cy="90"
            rx="54"
            ry="70"
            stroke="rgba(6,214,160,0.22)"
            strokeWidth="1.2"
          />
          {/* Subtle scan line */}
          <line
            x1="20"
            y1="62"
            x2="140"
            y2="62"
            stroke="rgba(6,214,160,0.06)"
            strokeWidth="0.5"
            strokeDasharray="3 6"
          />
          {/* Eye left */}
          <ellipse
            cx="59"
            cy="76"
            rx="8"
            ry="5"
            stroke="rgba(6,214,160,0.18)"
            strokeWidth="0.9"
          />
          {/* Eye right */}
          <ellipse
            cx="101"
            cy="76"
            rx="8"
            ry="5"
            stroke="rgba(6,214,160,0.18)"
            strokeWidth="0.9"
          />
          {/* Iris dots */}
          <circle cx="59" cy="76" r="2.5" fill="rgba(6,214,160,0.28)" />
          <circle cx="101" cy="76" r="2.5" fill="rgba(6,214,160,0.28)" />
          {/* Nose */}
          <path
            d="M80 87 L74 104 Q80 108 86 104 Z"
            stroke="rgba(6,214,160,0.14)"
            strokeWidth="0.8"
          />
          {/* Mouth */}
          <path
            d="M62 122 Q80 132 98 122"
            stroke="rgba(6,214,160,0.2)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          {/* Chin curve */}
          <path
            d="M62 148 Q80 160 98 148"
            stroke="rgba(6,214,160,0.1)"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
          {/* Neck lines */}
          <line
            x1="66"
            y1="160"
            x2="62"
            y2="194"
            stroke="rgba(6,214,160,0.1)"
            strokeWidth="0.8"
          />
          <line
            x1="94"
            y1="160"
            x2="98"
            y2="194"
            stroke="rgba(6,214,160,0.1)"
            strokeWidth="0.8"
          />
          {/* Side crosshair marks — medical scan feel */}
          <line
            x1="12"
            y1="76"
            x2="27"
            y2="76"
            stroke="rgba(6,214,160,0.1)"
            strokeWidth="0.5"
          />
          <line
            x1="133"
            y1="76"
            x2="148"
            y2="76"
            stroke="rgba(6,214,160,0.1)"
            strokeWidth="0.5"
          />
        </motion.svg>
      </div>
    </div>
  )
}
