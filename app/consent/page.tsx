'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TopNav } from '@/components/TopNav'
import { grantDoctorAccess, revokeDoctorAccess } from '@/lib/web3/sharingFlow'
import { isSimulationMode } from '@/lib/web3/consentContract'

const PATIENT = {
  name: 'John Smith',
  age: 52,
  gender: 'Male',
  dob: '1972-03-15',
  conditions: ['Hypertension', 'Prediabetes', 'Hyperlipidemia'],
  medications: ['Lisinopril 10mg', 'Atorvastatin 20mg'],
  vitals: {
    bp: '145/92 mmHg',
    ldl: '165 mg/dL',
    hdl: '42 mg/dL',
    bmi: '29',
    glucose: '108 mg/dL',
  },
}

type ExpiryOption = '24h' | '7d' | '30d'

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string; description: string }[] = [
  { value: '24h', label: '24 Hours', description: 'Emergency or single consultation' },
  { value: '7d', label: '7 Days', description: 'Short-term specialist review' },
  { value: '30d', label: '30 Days', description: 'Ongoing care coordination' },
]

function expiryDate(option: ExpiryOption): Date {
  const now = Date.now()
  const offsets: Record<ExpiryOption, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  return new Date(now + offsets[option])
}

function fakeTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

interface AccessRecord {
  doctorAddress: string
  expiry: Date
  txHash: string
  sharePackage?: string
}

export default function ConsentPage() {
  const simMode = isSimulationMode()

  const [doctorAddress, setDoctorAddress] = useState('')
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>('7d')
  const [isProcessing, setIsProcessing] = useState(false)
  const [accessRecord, setAccessRecord] = useState<AccessRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPackage, setShowPackage] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const patientAddress = '0x0000000000000000000000000000000000000000'

  const handleGrant = async () => {
    if (!doctorAddress.trim()) return
    setIsProcessing(true)
    setError(null)

    try {
      const expiry = expiryDate(expiryOption)

      if (simMode) {
        await new Promise(r => setTimeout(r, 1000))
        setAccessRecord({
          doctorAddress: doctorAddress.trim(),
          expiry,
          txHash: fakeTxHash(),
        })
      } else {
        const pkg = await grantDoctorAccess(patientAddress, doctorAddress.trim(), expiry)
        setAccessRecord({
          doctorAddress: doctorAddress.trim(),
          expiry,
          txHash: fakeTxHash(),
          sharePackage: pkg,
        })
      }

      setDoctorAddress('')
    } catch (err: any) {
      setError(err?.message ?? 'Transaction failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevoke = async () => {
    if (!accessRecord) return
    setIsRevoking(true)
    setError(null)

    try {
      if (simMode) {
        await new Promise(r => setTimeout(r, 700))
      } else {
        await revokeDoctorAccess(patientAddress, accessRecord.doctorAddress)
      }
      setAccessRecord(null)
      setShowPackage(false)
    } catch (err: any) {
      setError(err?.message ?? 'Revoke failed. Please try again.')
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <TopNav />

      <main className="max-w-[860px] mx-auto px-6 md:px-12 pt-8">

        {/* Back nav */}
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-[#999] hover:text-[#555] transition-colors mb-6">
          ← Back to Profile
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium text-[#1a1a1a]">Share Your Health Data</h1>
            <p className="text-sm font-normal text-[#999] mt-1">
              Grant temporary, revocable access to a trusted doctor.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${simMode ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {simMode ? 'Simulation Mode' : 'On-Chain'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5">

          {/* Patient Summary Card */}
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
            <h2 className="text-xs font-normal uppercase tracking-widest text-[#999] mb-4">Your Profile Summary</h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex items-center gap-3 sm:border-r sm:border-[#F0F0F0] sm:pr-6">
                <div className="h-10 w-10 rounded-full bg-[#F0F0F0] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-normal text-[#888]">JS</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">{PATIENT.name}</p>
                  <p className="text-xs text-[#999]">{PATIENT.age} yrs · {PATIENT.gender} · DOB {PATIENT.dob}</p>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(PATIENT.vitals).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] uppercase tracking-widest text-[#bbb] mb-0.5">
                      {k === 'bp' ? 'Blood Pressure' : k === 'ldl' ? 'LDL' : k === 'hdl' ? 'HDL' : k === 'bmi' ? 'BMI' : 'Glucose'}
                    </p>
                    <p className="text-sm font-medium text-[#1a1a1a]">{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-[#F0F0F0]">
              {PATIENT.conditions.map(c => (
                <span key={c} className="px-2 py-0.5 bg-[#F5F5F5] text-[#555] text-xs rounded">{c}</span>
              ))}
              {PATIENT.medications.map(m => (
                <span key={m} className="px-2 py-0.5 bg-[#EFF6FF] text-[#3B82F6] text-xs rounded">{m}</span>
              ))}
            </div>
          </div>

          {/* Grant Access Form */}
          {!accessRecord && (
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
              <h2 className="text-xs font-normal uppercase tracking-widest text-[#999] mb-4">Grant Access</h2>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#999] mb-1.5">
                    Doctor Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x…"
                    value={doctorAddress}
                    onChange={e => setDoctorAddress(e.target.value)}
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:border-[#999] transition-colors placeholder:text-[#ccc] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#999] mb-2">
                    Access Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPIRY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setExpiryOption(opt.value)}
                        className={`flex flex-col items-start p-3 border rounded-lg text-left transition-colors ${
                          expiryOption === opt.value
                            ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                            : 'border-[#E5E5E5] text-[#555] hover:border-[#999]'
                        }`}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className={`text-[11px] mt-0.5 ${expiryOption === opt.value ? 'text-[#aaa]' : 'text-[#999]'}`}>
                          {opt.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGrant}
                  disabled={isProcessing || !doctorAddress.trim()}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing…' : `Grant Access${simMode ? ' (Simulated)' : ' On-Chain'}`}
                </button>

                {error && (
                  <p className="text-xs text-rose-500">{error}</p>
                )}
              </div>
            </div>
          )}

          {/* Access Status */}
          {accessRecord && (
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-normal uppercase tracking-widest text-[#999]">Access Status</h2>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">Active</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] uppercase tracking-widest text-[#bbb]">Doctor Address</p>
                  <p className="text-sm font-mono text-[#555] break-all">{accessRecord.doctorAddress}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#bbb] mb-0.5">Expires</p>
                    <p className="text-sm text-[#1a1a1a]">
                      {accessRecord.expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#bbb] mb-0.5">
                      {simMode ? 'Simulated Tx' : 'Tx Hash'}
                    </p>
                    <p className="text-xs font-mono text-[#999] truncate">{accessRecord.txHash.slice(0, 18)}…</p>
                  </div>
                </div>

                {accessRecord.sharePackage && (
                  <>
                    <button
                      onClick={() => setShowPackage(p => !p)}
                      className="text-xs text-blue-500 hover:underline text-left"
                    >
                      {showPackage ? 'Hide' : 'Show'} encrypted share package
                    </button>
                    {showPackage && (
                      <textarea
                        readOnly
                        value={accessRecord.sharePackage}
                        rows={4}
                        className="w-full text-[10px] font-mono text-[#555] border border-[#E5E5E5] rounded p-2 bg-[#FAFAFA] resize-none"
                      />
                    )}
                  </>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F0]">
                  <button
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="px-3 py-1.5 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {isRevoking ? 'Revoking…' : 'Revoke Access'}
                  </button>
                  <button
                    onClick={() => setAccessRecord(null)}
                    className="text-xs text-[#999] hover:text-[#555] transition-colors"
                  >
                    Grant to another doctor
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-rose-500">{error}</p>
                )}
              </div>
            </div>
          )}

          {/* What will be shared */}
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
            <h2 className="text-xs font-normal uppercase tracking-widest text-[#999] mb-3">What Will Be Shared</h2>
            <ul className="flex flex-col gap-2">
              {[
                'Profile summary — name, age, gender, date of birth',
                'Vitals — blood pressure, BMI, LDL, HDL, glucose',
                'Active conditions — hypertension, prediabetes, hyperlipidemia',
                'Current medications — Lisinopril, Atorvastatin',
                'AI health timeline insights',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#555]">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#999] mt-3 pt-3 border-t border-[#F0F0F0]">
              Raw diagnostic images, notes, and genomic data are never included.
            </p>
          </div>

          {/* Privacy Card */}
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
            <h2 className="text-xs font-normal uppercase tracking-widest text-[#999] mb-3">Privacy-First by Design</h2>
            <div className="flex flex-col gap-3">
              {[
                {
                  title: 'Consent lives on-chain, data stays local',
                  body: 'Your health records are never sent to the blockchain. Only the access grant — who can view your data and until when — is stored on-chain.',
                },
                {
                  title: 'Encrypted at rest',
                  body: 'All locally stored patient data is encrypted with AES-GCM-256 using a key that never leaves your device.',
                },
                {
                  title: 'Revocable at any time',
                  body: 'You can revoke a doctor\'s access immediately. The on-chain record updates within seconds.',
                },
              ].map(item => (
                <div key={item.title}>
                  <p className="text-sm font-medium text-[#1a1a1a]">{item.title}</p>
                  <p className="text-sm text-[#999] mt-0.5">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
