'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import * as THREE from 'three'

const N = 1500
const CONNECT_D2 = 0.22 * 0.22

function makeSprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  r.addColorStop(0, 'rgba(0,229,255,1)')
  r.addColorStop(0.35, 'rgba(0,229,255,0.5)')
  r.addColorStop(1, 'rgba(0,229,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(c)
}

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
})

export function ParticleAwakeningCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const eyeRef   = useRef<HTMLDivElement>(null)
  const router   = useRouter()

  // ── Mouse eye parallax (direct DOM, no re-render) ──────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!eyeRef.current) return
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2
      const x = ((e.clientX - cx) / cx) * 8
      const y = ((e.clientY - cy) / cy) * 8
      eyeRef.current.style.transform = `translate(${x}px,${y}px)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Three.js ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const W = mount.clientWidth, H = mount.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100)
    camera.position.z = 3

    const aspect = W / H
    const posArr  = new Float32Array(N * 3)
    const origPos = new Float32Array(N * 3)
    const phases  = new Float32Array(N * 4)   // phaseX, phaseY, speedX, speedY

    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 3 * aspect
      const y = (Math.random() - 0.5) * 3
      origPos[i*3] = posArr[i*3] = x
      origPos[i*3+1] = posArr[i*3+1] = y
      origPos[i*3+2] = posArr[i*3+2] = 0
      phases[i*4]   = Math.random() * Math.PI * 2
      phases[i*4+1] = Math.random() * Math.PI * 2
      phases[i*4+2] = 0.2 + Math.random() * 0.25
      phases[i*4+3] = 0.2 + Math.random() * 0.25
    }

    const pGeom   = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(posArr, 3)
    pGeom.setAttribute('position', posAttr)

    const sprite = makeSprite()
    const pMat = new THREE.PointsMaterial({
      map: sprite, color: 0x00e5ff, size: 4,
      sizeAttenuation: false, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    scene.add(new THREE.Points(pGeom, pMat))

    // Static topology computed once from initial positions
    const idxA: number[] = [], idxB: number[] = []
    for (let i = 0; i < N; i++) {
      let c = 0
      for (let j = i + 1; j < N && c < 3; j++) {
        const dx = origPos[i*3] - origPos[j*3]
        const dy = origPos[i*3+1] - origPos[j*3+1]
        if (dx*dx + dy*dy < CONNECT_D2) { idxA.push(i); idxB.push(j); c++ }
      }
    }
    const M       = idxA.length
    const lineArr = new Float32Array(M * 6)
    const lGeom   = new THREE.BufferGeometry()
    const lAttr   = new THREE.BufferAttribute(lineArr, 3)
    lGeom.setAttribute('position', lAttr)
    const lMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    scene.add(new THREE.LineSegments(lGeom, lMat))

    let raf: number
    const clock = new THREE.Clock()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      // Convergence: ramps 0→0.3 between t=3..4.5s
      const cp   = t < 3 ? 0 : Math.min((t - 3) / 1.5, 1)
      const conv = cp * 0.3
      lMat.opacity = 0.08 + cp * 0.12

      for (let i = 0; i < N; i++) {
        const bx = origPos[i*3]   * (1 - conv)
        const by = origPos[i*3+1] * (1 - conv)
        posArr[i*3]   = bx + Math.sin(t * phases[i*4+2] + phases[i*4])   * 0.08
        posArr[i*3+1] = by + Math.cos(t * phases[i*4+3] + phases[i*4+1]) * 0.08
      }
      posAttr.needsUpdate = true

      for (let k = 0; k < M; k++) {
        const a = idxA[k], b = idxB[k]
        lineArr[k*6]   = posArr[a*3];   lineArr[k*6+1] = posArr[a*3+1]; lineArr[k*6+2] = 0
        lineArr[k*6+3] = posArr[b*3];   lineArr[k*6+4] = posArr[b*3+1]; lineArr[k*6+5] = 0
      }
      lAttr.needsUpdate = true

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const W2 = mount.clientWidth, H2 = mount.clientHeight
      camera.aspect = W2 / H2; camera.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      pGeom.dispose(); lGeom.dispose(); pMat.dispose(); lMat.dispose(); sprite.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#020617' }}>
      {/* Canvas */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">

        {/* Eyes */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 4.5, duration: 1.5, ease: 'easeOut' }}
        >
          <div
            ref={eyeRef}
            className="flex items-center gap-[120px]"
            style={{ transition: 'transform 0.15s ease-out' }}
          >
            {(['left', 'right'] as const).map((side, idx) => (
              <motion.div
                key={side}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.15 }}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0,229,255,1) 0%, rgba(0,229,255,0.4) 40%, rgba(0,229,255,0) 70%)',
                  boxShadow: '0 0 20px 8px rgba(0,229,255,0.3)',
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Text */}
        <div className="mt-10 flex flex-col items-center text-center">
          <motion.p {...fade(6.0)} className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Digital Health Twin
          </motion.p>
          <motion.h1 {...fade(6.2)} className="mt-3 text-5xl font-bold text-white lg:text-6xl">
            Meet Your Future Self
          </motion.h1>
          <motion.p {...fade(6.4)} className="mt-4 max-w-xl text-lg leading-relaxed text-slate-400">
            A calm AI health twin that simulates your risks, explains your future,
            and helps you understand your body.
          </motion.p>
          <motion.div {...fade(6.6)} className="pointer-events-auto mt-8">
            <button
              onClick={() => router.push('/voice')}
              className="group inline-flex items-center gap-3 rounded-full bg-cyan-500 px-8 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.05] hover:bg-cyan-400 active:scale-[0.97]"
              style={{ boxShadow: '0 0 28px rgba(0,229,255,0.4)' }}
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-black/20" />
                <Mic className="relative h-4 w-4" />
              </span>
              Talk to Your Twin
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
