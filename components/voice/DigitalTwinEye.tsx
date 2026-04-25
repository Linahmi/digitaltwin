'use client'

import { useEffect, useRef } from 'react'

// ── Shaders ──────────────────────────────────────────────────────────────────

const VERTEX_SHADER = `
  uniform float time;
  uniform float audioLevel;
  uniform float slowBreath;
  uniform float drift;

  attribute float angle;
  attribute float radius;
  attribute float speed;
  attribute float size;
  attribute float depthOffset;
  attribute float organicOffset;

  varying vec3 vColor;
  varying float vIntensity;
  varying float vDepth;

  // Simplex noise helpers
  vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289v4(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x)  { return mod289v4(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289v3(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0,i1.z,i2.z,1.0))
      + i.y + vec4(0.0,i1.y,i2.y,1.0))
      + i.x + vec4(0.0,i1.x,i2.x,1.0));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4  j  = p - 49.0 * floor(p * ns.z * ns.z);
    vec4  x_ = floor(j * ns.z);
    vec4  y_ = floor(j - 7.0 * x_);
    vec4  x  = x_ *ns.x + ns.yyyy;
    vec4  y  = y_ *ns.x + ns.yyyy;
    vec4  h  = 1.0 - abs(x) - abs(y);
    vec4  b0 = vec4(x.xy,  y.xy);
    vec4  b1 = vec4(x.zw,  y.zw);
    vec4  s0 = floor(b0)*2.0 + 1.0;
    vec4  s1 = floor(b1)*2.0 + 1.0;
    vec4  sh = -step(h, vec4(0.0));
    vec4  a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4  a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3  p0 = vec3(a0.xy, h.x);
    vec3  p1 = vec3(a0.zw, h.y);
    vec3  p2 = vec3(a1.xy, h.z);
    vec3  p3 = vec3(a1.zw, h.w);
    vec4  nm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= nm.x; p1 *= nm.y; p2 *= nm.z; p3 *= nm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    float slowRot     = time * speed * 0.02;
    float curAngle    = angle + slowRot;

    vec3 nc = vec3(
      cos(curAngle) * radius * 0.015,
      sin(curAngle) * radius * 0.015,
      time * 0.08
    );

    float n1 = snoise(nc);
    float n2 = snoise(nc * 2.3 + vec3(100.0, 50.0, time * 0.05));
    float n3 = snoise(nc * 0.4 + vec3(200.0, 100.0, time * 0.03));
    float cn = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

    float organicVar = organicOffset * (1.0 + cn * 0.3);

    // FIXED: breath amplitude reduced ~70% vs reference
    float breatheEff = slowBreath * (1.0 - radius * 0.4) * 0.18;
    float driftEff   = drift * cn * (radius * 0.01);

    // FIXED: audio reactivity reduced ~65% vs reference
    float audioEff   = audioLevel * radius * 0.05;

    float raw = radius + organicVar + breatheEff + driftEff + audioEff;

    // FIXED: hard minimum clamp — iris never collapses below 60% of rest radius
    float finalRadius = max(raw, radius * 0.62);

    float angleDistort  = cn * 0.15 + n3 * 0.1;
    float distortedAngle = curAngle + angleDistort;

    vec3 pos;
    pos.x = cos(distortedAngle) * finalRadius;
    pos.y = sin(distortedAngle) * finalRadius;
    pos.z = depthOffset + cn * 12.0 + n3 * 8.0;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Inner particles are smaller so they don't pile up into a white disk
    float innerDim = smoothstep(0.0, 0.35, radius / 160.0);
    float nSize    = 1.0 + n2 * 0.2;
    gl_PointSize = size * (300.0 / -mvPos.z) * (0.55 + innerDim * 0.75) * nSize;

    // Color gradient: deep purple → purple → blue → cyan
    // Inner tones deliberately darker to avoid center blowout
    vec3 innerColor = vec3(0.38, 0.24, 0.62);
    vec3 midColor   = vec3(0.47, 0.31, 0.80);
    vec3 outerColor = vec3(0.45, 0.69, 0.98);
    vec3 edgeColor  = vec3(0.58, 0.86, 0.99);
    vec3 fadeColor  = vec3(0.74, 0.92, 0.99);

    float rn = (radius + cn * 8.0) / 160.0;

    if (rn < 0.25) {
      vColor = mix(innerColor, midColor,   rn / 0.25);
    } else if (rn < 0.5) {
      vColor = mix(midColor,   outerColor, (rn - 0.25) / 0.25);
    } else if (rn < 0.75) {
      vColor = mix(outerColor, edgeColor,  (rn - 0.5)  / 0.25);
    } else {
      vColor = mix(edgeColor,  fadeColor,  (rn - 0.75) / 0.25);
    }

    // Intensity: fades toward edges AND dims the inner zone to suppress center glow
    float centerDim = smoothstep(0.0, 0.32, rn);           // 0 at center → 1 at rn≈0.32
    vIntensity  = (1.0 - smoothstep(0.25, 1.05, rn)) * (0.45 + centerDim * 0.55);
    vIntensity *= (0.85 + audioLevel * 0.15);
    vIntensity *= (1.0  + n1 * 0.1);
    vDepth = pos.z;
  }
`

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vIntensity;
  varying float vDepth;

  void main() {
    vec2  ctr  = gl_PointCoord - vec2(0.5);
    float dist = length(ctr);
    if (dist > 0.5) discard;

    // Organic soft edge
    float alpha = 1.0 - smoothstep(0.15, 0.5, dist);
    alpha = pow(alpha, 1.2);

    float core  = pow(1.0 - smoothstep(0.0, 0.35, dist), 2.0);
    float depth = smoothstep(-20.0, 20.0, vDepth);

    vec3 col = vColor + vec3(core * 0.08);
    col *= (0.9 + depth * 0.2);
    col *= vIntensity;

    gl_FragColor = vec4(col, alpha * vIntensity * 0.9);
  }
`

// ── Soft pupil ring shader ────────────────────────────────────────────────────

const PUPIL_RING_VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`

const PUPIL_RING_FRAG = `
  uniform vec3 innerColor;
  uniform vec3 outerColor;
  varying vec2 vUv;
  void main() {
    float d = clamp(length(vUv - vec2(0.5)) * 2.0, 0.0, 1.0);
    vec3  c = mix(innerColor, outerColor, d);
    float a = (1.0 - smoothstep(0.0, 1.0, d)) * 0.82;
    gl_FragColor = vec4(c, a);
  }
`

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  isListening: boolean
  canInteract: boolean
  onClick: () => void
  size?: number
}

export function DigitalTwinEye({ isListening, canInteract, onClick, size = 260 }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const isListeningRef  = useRef(isListening)

  // Keep ref in sync without re-running the Three.js effect
  useEffect(() => { isListeningRef.current = isListening }, [isListening])

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const cancelled = { v: false }
    let cleanupFn: (() => void) | null = null

    ;(async () => {
      const THREE            = await import('three')
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js' as any)
      const { RenderPass }     = await import('three/examples/jsm/postprocessing/RenderPass.js' as any)
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js' as any)

      if (cancelled.v) return

      // ── Scene ──────────────────────────────────────────────────────────────
      const scene    = new THREE.Scene()
      const camera   = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
      camera.position.z = 420

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)

      // ── Particle geometry ──────────────────────────────────────────────────
      const PC = 15000
      const FC = 180

      const positions      = new Float32Array(PC * 3)
      const angles         = new Float32Array(PC)
      const radii          = new Float32Array(PC)
      const speeds         = new Float32Array(PC)
      const sizes          = new Float32Array(PC)
      const depthOffsets   = new Float32Array(PC)
      const organicOffsets = new Float32Array(PC)

      for (let i = 0; i < PC; i++) {
        const fid = i % FC
        const t   = Math.floor(i / FC) / Math.floor(PC / FC)

        angles[i] = (fid / FC) * Math.PI * 2 + (Math.random() - 0.5) * 0.12

        const rand = t + (Math.random() - 0.5) * 0.1
        let r: number
        if (rand < 0.15) {
          r = 18  + Math.pow(rand / 0.15,           0.9)  * 30 + (Math.random() - 0.5) * 4
        } else if (rand < 0.45) {
          r = 48  + Math.pow((rand - 0.15) / 0.30,  0.85) * 55 + (Math.random() - 0.5) * 6
        } else if (rand < 0.75) {
          r = 103 + Math.pow((rand - 0.45) / 0.30,  1.0)  * 42 + (Math.random() - 0.5) * 7
        } else {
          r = 145 + Math.pow((rand - 0.75) / 0.25,  1.5)  * 20 + (Math.random() - 0.5) * 8
        }
        radii[i]  = r
        speeds[i] = 0.3 + Math.random() * 0.7

        sizes[i] = r < 48
          ? 3.2 + Math.random() * 1.1
          : r < 103
            ? 3.8 + Math.random() * 0.8
            : r < 145
              ? 3.0 + Math.random() * 0.9
              : 2.0 + Math.random() * 0.8

        depthOffsets[i]   = (Math.random() - 0.5) * 40 + Math.sin(fid * 0.3) * 15
        organicOffsets[i] = (Math.random() - 0.5) * 8  + Math.cos(fid * 0.5) * 4

        positions[i * 3] = positions[i * 3 + 1] = positions[i * 3 + 2] = 0
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position',      new THREE.BufferAttribute(positions,      3))
      geo.setAttribute('angle',         new THREE.BufferAttribute(angles,         1))
      geo.setAttribute('radius',        new THREE.BufferAttribute(radii,          1))
      geo.setAttribute('speed',         new THREE.BufferAttribute(speeds,         1))
      geo.setAttribute('size',          new THREE.BufferAttribute(sizes,          1))
      geo.setAttribute('depthOffset',   new THREE.BufferAttribute(depthOffsets,   1))
      geo.setAttribute('organicOffset', new THREE.BufferAttribute(organicOffsets, 1))

      const uniforms = {
        time:       { value: 0 },
        audioLevel: { value: 0 },
        slowBreath: { value: 0 },
        drift:      { value: 0 },
      }

      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader:   VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
      })

      scene.add(new THREE.Points(geo, mat))

      // ── Soft pupil — larger radius to better contain the bright center ───────
      const pupilGeo = new THREE.CircleGeometry(28, 64)
      const pupilMat = new THREE.MeshBasicMaterial({
        color: 0x1a1230, transparent: true, opacity: 0.68,
      })
      const pupil = new THREE.Mesh(pupilGeo, pupilMat)
      pupil.position.z = 6

      const ringGeo = new THREE.RingGeometry(28, 46, 64)
      const ringMat = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          innerColor: { value: new THREE.Color(0x22143d) },
          outerColor: { value: new THREE.Color(0x4a2a78) },
        },
        vertexShader:   PUPIL_RING_VERT,
        fragmentShader: PUPIL_RING_FRAG,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.z = 5

      scene.add(pupil)
      scene.add(ring)

      // ── Post-processing ────────────────────────────────────────────────────
      const composer = new EffectComposer(renderer)
      composer.addPass(new RenderPass(scene, camera))
      // Lower strength + higher threshold = only bright mid/outer iris triggers bloom
      const bloom = new UnrealBloomPass(new THREE.Vector2(size, size), 0.72, 0.50, 0.94)
      composer.addPass(bloom)

      // ── Animation loop ─────────────────────────────────────────────────────
      const clock = new THREE.Clock()
      let animId  = 0
      let alive   = true
      let fakeAudio = 0
      let fakeAudioTarget = 0

      function tick() {
        if (!alive) return
        animId = requestAnimationFrame(tick)

        const t = clock.getElapsedTime()
        const listening = isListeningRef.current

        // Simulated audio reactivity when listening
        fakeAudioTarget = listening
          ? 0.12 + Math.sin(t * 2.7) * 0.07 + Math.sin(t * 5.1) * 0.04
          : 0
        fakeAudio += (fakeAudioTarget - fakeAudio) * 0.06

        // Multi-frequency breath — ~25% faster than before, still subtle and smooth
        const breath = Math.sin(t * 0.26) * 3 + Math.sin(t * 0.39) * 2 + Math.sin(t * 0.22) * 1.5
        const driftV = Math.sin(t * 0.16) * Math.cos(t * 0.09) + Math.cos(t * 0.24) * Math.sin(t * 0.14)

        uniforms.time.value       = t
        uniforms.audioLevel.value = fakeAudio
        uniforms.slowBreath.value = breath
        uniforms.drift.value      = driftV

        // Gentle bloom variation — target range stays modest
        const targetBloom = listening ? 0.95 + fakeAudio * 0.20 : 0.72 + Math.sin(t * 0.31) * 0.06
        bloom.strength   += (targetBloom - bloom.strength) * 0.05

        // Slow camera micro-drift for organic feel
        camera.position.x = Math.sin(t * 0.11) * 2.5 + Math.cos(t * 0.23) * 1.2
        camera.position.y = Math.cos(t * 0.15) * 2.5 + Math.sin(t * 0.19) * 1.2
        camera.position.z = 420 + Math.sin(t * 0.09) * 2
        camera.lookAt(scene.position)

        // Pupil breathes in sync with the faster breath cycle
        const ps = 1.0 + Math.sin(t * 0.28) * 0.018 + fakeAudio * 0.04
        pupil.scale.set(ps, ps, 1)
        ring.scale.set(ps, ps, 1)

        composer.render()
      }

      tick()

      cleanupFn = () => {
        alive = false
        cancelAnimationFrame(animId)
        geo.dispose()
        mat.dispose()
        renderer.dispose()
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      }
    })()

    return () => {
      cancelled.v = true
      cleanupFn?.()
    }
  }, [size]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      onClick={canInteract ? onClick : undefined}
      aria-label={isListening ? 'Stop listening' : 'Start listening'}
      role="button"
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        overflow:     'hidden',
        cursor:       canInteract ? 'pointer' : 'default',
        opacity:      canInteract ? 1 : 0.7,
        transition:   'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.3,0.64,1)',
        boxShadow:    isListening
          ? '0 24px 70px rgba(139,92,246,0.28), 0 10px 30px rgba(6,182,212,0.18)'
          : '0 16px 50px rgba(139,92,246,0.15), 0 6px 18px rgba(0,0,0,0.07)',
        background:   'radial-gradient(circle at center, rgba(255,255,255,0.42) 0%, rgba(244,114,182,0.12) 34%, rgba(6,182,212,0.08) 58%, rgba(255,255,255,0) 82%)',
        backdropFilter: 'blur(2px)',
      }}
    />
  )
}
