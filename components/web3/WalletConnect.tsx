'use client'

import { useState } from 'react'

export function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
        setAddress(accounts[0])
      } else {
        // Fallback simulate connection for hackathon demo
        setTimeout(() => {
          setAddress('0x71C...976F')
        }, 800)
      }
    } catch (error) {
      console.error("Connection failed", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => setAddress(null)

  return (
    <div className="flex items-center">
      {address ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E5E5] bg-white rounded-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-[#1a1a1a]">
              {address.slice(0, 5)}...{address.slice(-4)}
            </span>
          </div>
          <button 
            onClick={disconnectWallet}
            className="text-xs text-[#999] hover:text-[#555] transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
