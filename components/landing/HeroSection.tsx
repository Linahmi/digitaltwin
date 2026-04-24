'use client'

import { motion, type MotionProps } from 'framer-motion'
import Link from 'next/link'
import { Activity, ArrowRight, Brain, FlaskConical, ShieldCheck } from 'lucide-react'

const fadeUp = (delay = 0): Pick<MotionProps, 'initial' | 'animate' | 'transition'> => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: 'easeOut' },
})

const FEATURES = [
  { icon: Brain, label: 'What-if Simulations' },
  { icon: FlaskConical, label: 'PubMed Citations' },
  { icon: ShieldCheck, label: 'Privacy-First' },
]

export function HeroSection() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
      {/* Badge */}
      <motion.div {...fadeUp(0)}>
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-medium tracking-wide text-teal-400">
          <Activity className="h-3 w-3" />
          AI-Powered Health Intelligence
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        {...fadeUp(0.1)}
        className="mt-8 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
      >
        Meet Your
        <br />
        <span
          className="text-teal-400"
          style={{ textShadow: '0 0 48px rgba(6,214,160,0.45)' }}
        >
          Digital Health Twin
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        {...fadeUp(0.2)}
        className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400"
      >
        A conversational AI that knows your complete health profile. Ask anything,
        simulate life changes, and get evidence-backed answers — specific to you.
      </motion.p>

      {/* Risk preview card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.3, ease: 'easeOut' }}
        className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-5 backdrop-blur-sm"
      >
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-slate-500">
          Marc Duval · 52 yo · Framingham 10-yr CVD Risk
        </p>
        <div className="flex items-center justify-center gap-8">
          <div className="text-left">
            <p className="text-4xl font-bold text-red-400">21%</p>
            <p className="mt-1 text-xs text-slate-500">Current risk</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="h-5 w-5 text-slate-600" />
            <span className="text-[10px] text-slate-600">what-if</span>
          </div>
          <div className="text-left">
            <p
              className="text-4xl font-bold text-teal-400"
              style={{ textShadow: '0 0 20px rgba(6,214,160,0.4)' }}
            >
              11%
            </p>
            <p className="mt-1 text-xs text-slate-500">If quit smoking + exercise</p>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div {...fadeUp(0.4)} className="mt-10">
        <Link
          href="/voice"
          className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:bg-teal-400"
          style={{ boxShadow: '0 0 32px rgba(6,214,160,0.35)' }}
        >
          Talk to Your Twin
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.55 }}
        className="mt-12 flex flex-wrap justify-center gap-3"
      >
        {FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-400 backdrop-blur-sm"
          >
            <Icon className="h-3.5 w-3.5 text-teal-400" />
            {label}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
