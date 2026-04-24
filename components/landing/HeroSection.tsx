'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'

// Text appears after particles settle and face forms (~4.5s)
const BASE = 4.5

const blurUp = (delay: number) => ({
  initial: { opacity: 0, y: 22, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.95, delay, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
})

export function HeroSection() {
  const [initializing, setInitializing] = useState(false)
  const router = useRouter()

  const handleCTA = () => {
    setInitializing(true)
    setTimeout(() => {
      router.push('/voice')
    }, 1300)
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
      <AnimatePresence mode="wait">
        {!initializing ? (
          <motion.div
            key="content"
            className="flex flex-col items-center"
            exit={{ opacity: 0, filter: 'blur(8px)', transition: { duration: 0.45 } }}
          >
            {/* Label */}
            <motion.p
              {...blurUp(BASE)}
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-600"
            >
              Digital Health Twin
            </motion.p>

            {/* Headline */}
            <motion.h1
              {...blurUp(BASE + 0.18)}
              className="mt-5 text-5xl font-light tracking-tight text-slate-800 sm:text-6xl lg:text-7xl"
            >
              Meet Your
              <br />
              <span className="font-semibold text-slate-900">Future Self</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              {...blurUp(BASE + 0.35)}
              className="mt-6 max-w-[420px] text-base leading-relaxed text-slate-500"
            >
              A calm AI health twin that simulates your risks, explains your future,
              and helps you understand your body.
            </motion.p>

            {/* CTA */}
            <motion.div {...blurUp(BASE + 0.52)} className="mt-10">
              <button
                onClick={handleCTA}
                className="group inline-flex items-center gap-3 rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.04] hover:bg-teal-400 active:scale-[0.98]"
                style={{
                  boxShadow:
                    '0 0 40px rgba(6,214,160,0.28), 0 4px 20px rgba(6,214,160,0.18)',
                }}
              >
                {/* Pulsing mic icon */}
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/25 opacity-75" />
                  <Mic className="relative h-4 w-4" />
                </span>
                Start Conversation
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </button>
            </motion.div>

            {/* Privacy note */}
            <motion.p
              {...blurUp(BASE + 0.7)}
              className="mt-4 text-xs text-slate-400"
            >
              Your data stays private. Always.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="initializing"
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Mic className="h-7 w-7 text-teal-500" />
            </motion.div>
            <p className="text-sm font-medium tracking-[0.18em] text-teal-600 uppercase">
              Initializing your twin...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
