'use client'

import { useEffect, useRef } from 'react'

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number

    interface P {
      x: number; y: number
      vx: number; vy: number
      size: number; opacity: number
    }

    let W = 0, H = 0
    let ps: P[] = []

    const init = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
      ps = Array.from({ length: 110 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: 1.2 + Math.random() * 1.6,
        opacity: 0.4 + Math.random() * 0.45,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Connection lines
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x
          const dy = ps[i].y - ps[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 130) {
            ctx.beginPath()
            ctx.moveTo(ps[i].x, ps[i].y)
            ctx.lineTo(ps[j].x, ps[j].y)
            ctx.strokeStyle = `rgba(0,229,255,${0.18 * (1 - d / 130)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Dots
      for (const p of ps) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
        g.addColorStop(0,   `rgba(0,229,255,${p.opacity})`)
        g.addColorStop(0.5, `rgba(0,229,255,${p.opacity * 0.2})`)
        g.addColorStop(1,   'rgba(0,229,255,0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    init()
    draw()
    window.addEventListener('resize', init)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', init) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}
