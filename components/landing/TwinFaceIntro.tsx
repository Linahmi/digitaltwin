'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const N = 2000
const COLOR = 0x06d6a0
const LINE_DIST = 0.16

// Fibonacci lattice — uniform distribution on sphere
function fibSphere(n: number): THREE.Vector3[] {
  const phi = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = phi * i
    return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r)
  })
}

// Deform unit-sphere point into face-like shape
function morphFace(p: THREE.Vector3): THREE.Vector3 {
  const { x, y, z } = p
  let vx = x * 0.82
  let vy = y * 1.15
  let vz = z * 0.88

  if (z > 0.05) {
    // Nose protrusion
    vz += Math.exp(-(x * x * 26 + (y + 0.10) * (y + 0.10) * 19)) * 0.17
    // Eye socket indents
    for (const [ex, ey] of [[-0.27, 0.29], [0.27, 0.29]] as [number, number][])
      vz -= Math.exp(-((x - ex) * (x - ex) * 15 + (y - ey) * (y - ey) * 19)) * 0.07
    // Brow ridge
    vz += Math.exp(-(x * x * 3.5 + (y - 0.43) * (y - 0.43) * 25)) * 0.07
    // Mouth depression
    vz -= Math.exp(-(x * x * 9 + (y + 0.30) * (y + 0.30) * 14)) * 0.04
    // Cheekbones
    for (const ex of [-0.40, 0.40])
      vz += Math.exp(-((x - ex) * (x - ex) * 8 + (y - 0.06) * (y - 0.06) * 10)) * 0.045
  }

  // Chin taper
  if (y < -0.52) {
    const f = Math.max(0.3, 1 - ((-y - 0.52) / 0.58) * 0.6)
    vx *= f; vz *= f
  }

  return new THREE.Vector3(vx, vy, vz)
}

export function TwinFaceIntro() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = mount.clientWidth
    const H = mount.clientHeight

    // Renderer — transparent bg so page color shows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    camera.position.z = 3.6

    // Build morphed face vertices with tiny jitter
    const verts = fibSphere(N).map(p => {
      const j = p.clone()
      j.x += (Math.random() - 0.5) * 0.025
      j.y += (Math.random() - 0.5) * 0.025
      j.z += (Math.random() - 0.5) * 0.025
      return morphFace(j)
    })

    // Points geometry
    const origPos = new Float32Array(N * 3)
    verts.forEach((v, i) => { origPos[i*3]=v.x; origPos[i*3+1]=v.y; origPos[i*3+2]=v.z })
    const posArr = origPos.slice()
    const pGeom = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(posArr, 3)
    pGeom.setAttribute('position', posAttr)

    // Soft circular sprite texture for glow
    const sc = document.createElement('canvas'); sc.width = sc.height = 32
    const sc2 = sc.getContext('2d')!
    const sg = sc2.createRadialGradient(16, 16, 0, 16, 16, 16)
    sg.addColorStop(0, 'rgba(6,214,160,1)')
    sg.addColorStop(0.4, 'rgba(6,214,160,0.4)')
    sg.addColorStop(1, 'rgba(6,214,160,0)')
    sc2.fillStyle = sg; sc2.fillRect(0, 0, 32, 32)
    const tex = new THREE.CanvasTexture(sc)

    const pMat = new THREE.PointsMaterial({
      map: tex, color: COLOR, size: 0.055,
      transparent: true, opacity: 0.88,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const points = new THREE.Points(pGeom, pMat)

    // Precompute static connection lines
    const lv: number[] = []
    const distSq = LINE_DIST * LINE_DIST
    for (let i = 0; i < N; i++) {
      let c = 0
      for (let j = i + 1; j < N && c < 4; j++) {
        const dx = verts[i].x - verts[j].x
        const dy = verts[i].y - verts[j].y
        const dz = verts[i].z - verts[j].z
        if (dx*dx + dy*dy + dz*dz < distSq) {
          lv.push(verts[i].x, verts[i].y, verts[i].z, verts[j].x, verts[j].y, verts[j].z)
          c++
        }
      }
    }
    const lGeom = new THREE.BufferGeometry()
    lGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lv), 3))
    const lMat = new THREE.LineBasicMaterial({
      color: COLOR, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const lines = new THREE.LineSegments(lGeom, lMat)

    const group = new THREE.Group()
    group.add(lines)
    group.add(points)
    scene.add(group)

    // Per-particle breathing phases
    const phases = Array.from({ length: N }, () => Math.random() * Math.PI * 2)
    const amps   = Array.from({ length: N }, () => 0.003 + Math.random() * 0.006)

    let raf: number
    const clock = new THREE.Clock()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      // Slow rotation + gentle x sway
      group.rotation.y = t * 0.12
      group.rotation.x = Math.sin(t * 0.33) * 0.035

      // Global breathing scale
      group.scale.setScalar(1 + Math.sin(t * 0.85) * 0.016)

      // Per-particle micro-float
      for (let i = 0; i < N; i++) {
        const ph = phases[i], a = amps[i]
        posAttr.setXYZ(i,
          origPos[i*3]   + Math.sin(t * 0.7 + ph) * a,
          origPos[i*3+1] + Math.cos(t * 0.5 + ph + 1.2) * a,
          origPos[i*3+2] + Math.sin(t * 0.6 + ph + 2.4) * a,
        )
      }
      posAttr.needsUpdate = true

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const W2 = mount.clientWidth, H2 = mount.clientHeight
      camera.aspect = W2 / H2
      camera.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      pGeom.dispose(); lGeom.dispose()
      pMat.dispose(); lMat.dispose(); tex.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className="pointer-events-none absolute inset-y-0 left-0"
      style={{ width: '50%' }}
    />
  )
}
