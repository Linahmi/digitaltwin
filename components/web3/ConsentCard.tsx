'use client'

import { useState } from 'react'
import { WalletConnect } from './WalletConnect'
import { grantDoctorAccess, revokeDoctorAccess } from '@/lib/web3/sharingFlow'
import { isSimulationMode }                       from '@/lib/web3/consentContract'

interface AccessRecord {
  doctorAddress: string
  expiryDate:    string   // ISO date string (YYYY-MM-DD)
  sharePackage?: string   // encrypted share payload — display as QR or copy
}

export function ConsentCard() {
  const [walletAddress,  setWalletAddress]  = useState<string | null>(null)
  const [access,         setAccess]         = useState<AccessRecord | null>(null)
  const [addressInput,   setAddressInput]   = useState('')
  const [expiryInput,    setExpiryInput]    = useState('')
  const [isProcessing,   setIsProcessing]   = useState(false)
  const [showSuccess,    setShowSuccess]    = useState(false)
  const [showPackage,    setShowPackage]    = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const handleGrantAccess = async () => {
    if (!addressInput || !expiryInput) return
    setIsProcessing(true)
    setError(null)

    try {
      const patientAddr = walletAddress ?? '0x0000000000000000000000000000000000000000'
      const expiryDate  = new Date(expiryInput + 'T23:59:59')

      const pkg = await grantDoctorAccess(patientAddr, addressInput, expiryDate)

      setAccess({ doctorAddress: addressInput, expiryDate: expiryInput, sharePackage: pkg })
      setAddressInput('')
      setExpiryInput('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 4000)
    } catch (err: any) {
      setError(err?.message ?? 'Transaction failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevokeAccess = async () => {
    if (!access) return
    setIsProcessing(true)
    setError(null)

    try {
      const patientAddr = walletAddress ?? '0x0000000000000000000000000000000000000000'
      await revokeDoctorAccess(patientAddr, access.doctorAddress)
      setAccess(null)
      setShowPackage(false)
    } catch (err: any) {
      setError(err?.message ?? 'Revoke failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col bg-white border border-[#E5E5E5] rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#F0F0F0]">
        <div>
          <h3 className="text-sm font-medium text-[#1a1a1a]">Secure Data Sharing</h3>
          <p className="text-xs font-normal text-[#999] mt-1">
            Web3 Medical Consent Layer
            {isSimulationMode() && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
                demo mode
              </span>
            )}
          </p>
        </div>
        <WalletConnect onAddressChange={setWalletAddress} />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Input Form */}
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#999] mb-1.5">
              Doctor Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x…"
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:border-[#999] transition-colors placeholder:text-[#ccc]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#999] mb-1.5">
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryInput}
              onChange={e => setExpiryInput(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:border-[#999] transition-colors"
            />
          </div>
          <button
            onClick={handleGrantAccess}
            disabled={isProcessing || !addressInput || !expiryInput}
            className="mt-2 w-full px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {isProcessing && !access ? 'Processing Transaction…' : 'Grant Access'}
          </button>

          {showSuccess && (
            <p className="text-xs font-medium text-emerald-500 mt-1">
              ✓ Access granted{isSimulationMode() ? ' (simulation)' : ' on-chain'}
            </p>
          )}
          {error && (
            <p className="text-xs text-rose-500 mt-1">{error}</p>
          )}
        </div>

        {/* Right: Active Permissions */}
        <div className="flex-1 flex flex-col border border-[#F0F0F0] rounded-lg p-4 bg-[#FAFAFA]">
          <h4 className="text-xs uppercase tracking-widest text-[#999] mb-3">
            Active Permissions
          </h4>

          {access ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-[#1a1a1a]">Access Active</span>
                </div>
                <span className="text-xs text-[#999]">Valid until {access.expiryDate}</span>
              </div>

              <div className="px-3 py-2 bg-white border border-[#E5E5E5] rounded text-sm text-[#555] font-mono mt-1 break-all">
                {access.doctorAddress}
              </div>

              {access.sharePackage && (
                <button
                  onClick={() => setShowPackage(p => !p)}
                  className="text-xs text-blue-500 hover:underline text-left"
                >
                  {showPackage ? 'Hide' : 'Show'} encrypted share package ↓
                </button>
              )}
              {showPackage && access.sharePackage && (
                <textarea
                  readOnly
                  value={access.sharePackage}
                  rows={4}
                  className="w-full text-[10px] font-mono text-[#555] border border-[#E5E5E5] rounded p-2 bg-white resize-none"
                />
              )}

              <button
                onClick={handleRevokeAccess}
                disabled={isProcessing}
                className="mt-auto self-start px-3 py-1.5 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Revoking…' : 'Revoke Access'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-6">
              <span className="text-sm text-[#999]">No active access shared</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
