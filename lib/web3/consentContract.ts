/**
 * TypeScript interface to the HealthConsent smart contract.
 *
 * ethers.js (v6) is dynamically imported so it only loads in the browser and
 * never on the server.  All functions are async and safe to call from any
 * 'use client' component.
 *
 * Configuration:
 *   NEXT_PUBLIC_CONSENT_CONTRACT_ADDRESS — deployed contract address
 *   NEXT_PUBLIC_CHAIN_ID                 — target chain (e.g. 11155111 for Sepolia)
 *
 * Simulation mode:
 *   If the env vars are missing or no EIP-1193 wallet is detected, every
 *   function falls back to a simulated in-memory implementation so the UI
 *   works for demos without a live deployment.
 */

// ── ABI ───────────────────────────────────────────────────────────────────────
// Human-readable ABI subset — only what the frontend needs.

const ABI = [
  'function grantAccess(address doctor, uint256 expiry) external',
  'function revokeAccess(address doctor) external',
  'function hasAccess(address patient, address doctor) external view returns (bool)',
  'function getExpiry(address patient, address doctor) external view returns (uint256)',
]

// ── Simulation fallback ───────────────────────────────────────────────────────
// In-memory map used when no contract is deployed.  Resets on page reload.

const _simStore = new Map<string, number>()   // `${patient}:${doctor}` → expiry ms

function simKey(patient: string, doctor: string) {
  return `${patient.toLowerCase()}:${doctor.toLowerCase()}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CONSENT_CONTRACT_ADDRESS &&
    typeof window !== 'undefined' &&
    (window as any).ethereum
  )
}

async function getContractReadOnly() {
  const { Contract, BrowserProvider } = await import('ethers')
  const provider = new BrowserProvider((window as any).ethereum)
  return new Contract(
    process.env.NEXT_PUBLIC_CONSENT_CONTRACT_ADDRESS!,
    ABI,
    provider,
  )
}

async function getContractWithSigner() {
  const { Contract, BrowserProvider } = await import('ethers')
  const provider = new BrowserProvider((window as any).ethereum)
  const signer   = await provider.getSigner()
  return new Contract(
    process.env.NEXT_PUBLIC_CONSENT_CONTRACT_ADDRESS!,
    ABI,
    signer,
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Grant `doctorAddress` access until `expiryDate`.
 * Calls grantAccess() on-chain, or stores in the simulation map.
 */
export async function grantAccess(
  patientAddress: string,
  doctorAddress: string,
  expiryDate: Date,
): Promise<void> {
  const expiryUnix = Math.floor(expiryDate.getTime() / 1000)

  if (isConfigured()) {
    const contract = await getContractWithSigner()
    const tx = await contract.grantAccess(doctorAddress, BigInt(expiryUnix))
    await tx.wait()
  } else {
    // Simulation mode
    await new Promise(r => setTimeout(r, 900))
    _simStore.set(simKey(patientAddress, doctorAddress), expiryDate.getTime())
  }
}

/**
 * Revoke `doctorAddress`'s access immediately.
 * Calls revokeAccess() on-chain, or removes from the simulation map.
 */
export async function revokeAccess(
  patientAddress: string,
  doctorAddress: string,
): Promise<void> {
  if (isConfigured()) {
    const contract = await getContractWithSigner()
    const tx = await contract.revokeAccess(doctorAddress)
    await tx.wait()
  } else {
    await new Promise(r => setTimeout(r, 700))
    _simStore.delete(simKey(patientAddress, doctorAddress))
  }
}

/**
 * Returns true if `doctorAddress` currently has unexpired access to
 * `patientAddress`'s data.
 */
export async function hasAccess(
  patientAddress: string,
  doctorAddress: string,
): Promise<boolean> {
  if (isConfigured()) {
    const contract = await getContractReadOnly()
    return contract.hasAccess(patientAddress, doctorAddress) as Promise<boolean>
  }
  const expiry = _simStore.get(simKey(patientAddress, doctorAddress)) ?? 0
  return expiry > Date.now()
}

/**
 * Returns the expiry Date for a patient/doctor pair, or null if no grant.
 */
export async function getExpiry(
  patientAddress: string,
  doctorAddress: string,
): Promise<Date | null> {
  if (isConfigured()) {
    const contract = await getContractReadOnly()
    const raw: bigint = await contract.getExpiry(patientAddress, doctorAddress)
    if (raw === BigInt(0)) return null
    return new Date(Number(raw) * 1000)
  }
  const ms = _simStore.get(simKey(patientAddress, doctorAddress))
  return ms ? new Date(ms) : null
}

/** Returns true when operating in simulation mode (no live contract). */
export function isSimulationMode(): boolean {
  return !isConfigured()
}
