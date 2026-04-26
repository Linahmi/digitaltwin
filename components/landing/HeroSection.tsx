'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'

const CYAN = '#00e5ff'

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
})

export function HeroSection() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const go = () => {
    setLoading(true)
    setTimeout(() => router.push('/voice'), 1200)
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AnimatePresence mode="wait">
        {!loading ? (
          <motion.div
            key="hero"
            className="flex flex-col items-center"
            exit={{ opacity: 0, filter: 'blur(8px)', transition: { duration: 0.35 } }}
          >
            {/* Label */}
            <motion.p
              {...fadeUp(0.3)}
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: CYAN }}
            >
              Dualis
            </motion.p>

            {/* Headline */}
            <motion.h1
              {...fadeUp(0.48)}
              className="mt-4 text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl"
            >
              Meet Your<br />
              <span style={{ color: CYAN }}>Future Self</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              {...fadeUp(0.64)}
              className="mt-5 max-w-md text-base leading-relaxed text-slate-400"
            >
              A calm AI health twin that simulates your risks, explains your
              future, and helps you understand your body.
            </motion.p>

            {/* CTA */}
            <motion.div {...fadeUp(0.80)} className="mt-9 flex items-center gap-4">
              <button
                onClick={go}
                className="group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
                style={{
                  background: CYAN,
                  boxShadow: `0 0 28px rgba(0,229,255,0.35), 0 2px 12px rgba(0,229,255,0.2)`,
                }}
              >
                Talk to Your Twin
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
              </button>

              {/* Mic button */}
              <motion.button
                onClick={go}
                aria-label="Start voice session"
                className="relative flex h-12 w-12 items-center justify-center rounded-full border"
                style={{ borderColor: 'rgba(0,229,255,0.4)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.93 }}
              >
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1.5px solid ${CYAN}` }}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                />
                <Mic className="h-5 w-5" style={{ color: CYAN }} />
              </motion.button>
            </motion.div>

            {/* Footer */}
            <motion.p {...fadeUp(0.96)} className="mt-5 text-xs text-slate-500">
              Your data stays private. Always.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Mic className="h-7 w-7" style={{ color: CYAN }} />
            </motion.div>
            <p className="text-sm uppercase tracking-widest text-slate-400">
              Initializing Dualis…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
