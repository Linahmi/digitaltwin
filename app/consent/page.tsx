'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldCheck, 
  UserPlus, 
  Clock, 
  Activity, 
  ChevronLeft, 
  Lock, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Database
} from 'lucide-react'
import Link from 'next/link'

// Mock contract address for demo
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONSENT_CONTRACT_ADDRESS || null

interface PatientData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  age: number | null
  gender: string | null
  initials?: string
}

export default function ConsentPortalPage() {
  const [data, setData] = useState<PatientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [doctorWallet, setDoctorWallet] = useState('')
  const [expiry, setExpiry] = useState('24h')
  const [status, setStatus] = useState<'inactive' | 'pending' | 'active'>('inactive')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'request' | 'status'>('request')

  useEffect(() => {
    fetch('/api/patient?preset=chadwick')
      .then(res => res.json())
      .then(json => {
        if (!json.error) {
          const initials = `${json.firstName?.[0] ?? 'P'}${json.lastName?.[0] ?? 'T'}`
          setData({ ...json, initials })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleGrantAccess = () => {
    if (!doctorWallet) return
    
    setStatus('pending')
    
    // Simulate blockchain confirmation delay
    setTimeout(() => {
      setStatus('active')
      setTxHash(`0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}92cd`)
      setActiveTab('status')
    }, 1500)
  }

  const handleRevokeAccess = () => {
    setStatus('inactive')
    setTxHash(null)
    setDoctorWallet('')
    setActiveTab('request')
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-[#F6FBFF] text-slate-900 font-sans">
      <div className="mx-auto max-w-2xl px-6 py-12 animate-fade-in">
        
        {/* Navigation */}
        <Link 
          href="/profile" 
          className="group mb-8 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Profile
        </Link>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-rose-600">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" />
            <p className="font-bold">Patient data unavailable</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Share your health data</h1>
                {CONTRACT_ADDRESS ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                    <div className="h-1 w-1 rounded-full bg-emerald-500" />
                    ON-CHAIN CONSENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 border border-blue-100">
                    <div className="h-1 w-1 rounded-full bg-blue-500" />
                    DEMO MODE
                  </span>
                )}
              </div>
              <p className="mt-2 text-slate-500 font-medium">Grant temporary access to a trusted medical professional.</p>
            </div>

            <div className="grid gap-6">
              
              {/* Section A: Patient Summary Card */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover-lift transition-shadow duration-300">
                <div className="border-b border-slate-50 bg-slate-50/50 px-6 py-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Patient Identity</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-900">
                      {data.initials}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{data.displayName}</h3>
                      <p className="text-sm text-slate-500">{data.age} yr · {data.gender}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 border border-blue-100 uppercase">
                      ACTIVE HEALTH TWIN
                    </span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 border border-slate-100 uppercase">
                      VERIFIED IDENTITY
                    </span>
                  </div>
                </div>
              </section>

          {/* Section B: Share Package Preview */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover-lift transition-shadow duration-300">
            <div className="border-b border-slate-50 bg-slate-50/50 px-6 py-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Data Package Content</h2>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-100">
              {[
                { label: 'Profile Summary', icon: Database },
                { label: 'Clinical Vitals', icon: Activity },
                { label: 'Conditions', icon: ShieldCheck },
                { label: 'Medications', icon: Lock },
                { label: 'Risk Insights', icon: Activity },
                { label: 'Timeline Summary', icon: Clock },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white p-4">
                  <item.icon className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Main Action Area */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex gap-1">
              <button 
                onClick={() => setActiveTab('request')}
                className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'request' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Grant Access
              </button>
              <button 
                onClick={() => setActiveTab('status')}
                className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'status' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Access Status
              </button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'request' ? (
                  <motion.div 
                    key="request"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Section C: Doctor Access */}
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Doctor Wallet Address</label>
                      <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={doctorWallet}
                          onChange={(e) => setDoctorWallet(e.target.value)}
                          placeholder="0x71C... or ENS name"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Access Expiry</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['24h', '7d', '30d'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setExpiry(opt)}
                            className={`rounded-xl border py-3 text-xs font-bold transition ${expiry === opt ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                          >
                            {opt === '24h' ? '24 Hours' : opt === '7d' ? '7 Days' : '30 Days'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGrantAccess}
                      disabled={!doctorWallet || status === 'pending' || status === 'active'}
                      className={`w-full rounded-xl py-4 text-sm font-bold shadow-lg transition-all button-pulse ${status === 'active' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98]'}`}
                    >
                      {status === 'pending' ? 'Broadcasting to Network...' : status === 'active' ? 'Access Granted' : 'Grant Medical Access'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="status"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Section D: Access Status */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">Network Status</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                          {status === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {status === 'active' ? 'ACTIVE' : 'NO ACTIVE SESSIONS'}
                        </span>
                      </div>

                      {status === 'active' ? (
                        <div className="space-y-4">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Authorized Doctor</div>
                            <div className="font-mono text-sm font-medium text-slate-700 truncate">{doctorWallet}</div>
                          </div>
                          <div className="flex justify-between">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Expires In</div>
                              <div className="text-sm font-medium text-slate-700">{expiry === '24h' ? '23h 59m' : expiry === '7d' ? '6d 23h' : '29d 23h'}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Tx Hash</div>
                              <a href="#" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                                {txHash}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <button 
                            onClick={handleRevokeAccess}
                            className="mt-4 w-full rounded-xl border border-rose-200 bg-rose-50 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 active:scale-[0.98]"
                          >
                            Revoke Access
                          </button>
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                          <p className="text-sm text-slate-400 font-medium">No active data sharing sessions found for this identity.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Section 4: Privacy Explanation Card */}
          <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-blue-900">Privacy-first medical consent</h2>
                <p className="mt-1 text-xs leading-relaxed text-blue-700/80 font-medium">
                  Your medical data is <span className="font-bold text-blue-900 underline decoration-blue-300/50">not stored on-chain</span>. 
                  The blockchain only records metadata: who is allowed to access your twin data and for how long. 
                  You retain full ownership and can revoke access at any time.
                </p>
              </div>
            </div>
          </section>

        </div>
        </>
        )}

        <footer className="mt-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Secure Medical Consent Portal · v1.0.4-beta
          </p>
        </footer>
      </div>
    </div>
  )
}
