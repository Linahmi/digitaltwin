'use client'

import { useState } from 'react'

interface WalletConnectProps {
  /** Called whenever the connected wallet address changes (or null on disconnect). */
  onAddressChange?: (address: string | null) => void
}

export function WalletConnect({ onAddressChange }: WalletConnectProps = {}) {
  const [address,      setAddress]      = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const updateAddress = (addr: string | null) => {
    setAddress(addr)
    onAddressChange?.(addr)
  }

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts: string[] = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        })
        updateAddress(accounts[0] ?? null)

        // Keep in sync if the user switches accounts in MetaMask
        ;(window as any).ethereum.on('accountsChanged', (accs: string[]) => {
          updateAddress(accs[0] ?? null)
        })
      } else {
        // Demo fallback — simulates a connected wallet for hackathon / no-MetaMask environments
        await new Promise(r => setTimeout(r, 800))
        updateAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
      }
    } catch (error) {
      console.error('Wallet connection failed', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => updateAddress(null)

  return (
    <div className="flex items-center">
      {address ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E5E5] bg-white rounded-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-[#1a1a1a]">
              {address.slice(0, 6)}…{address.slice(-4)}
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
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
