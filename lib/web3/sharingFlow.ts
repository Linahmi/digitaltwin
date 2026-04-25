/**
 * Secure sharing flow — patient → doctor.
 *
 * Steps (patient side):
 *   1. Patient selects "Share with doctor" and enters the doctor's wallet.
 *   2. prepareSharePackage() encrypts a minimal patient summary.
 *   3. grantDoctorAccess() records the permission on the smart contract
 *      and returns the encrypted package (to be sent out-of-band or via QR).
 *
 * Steps (doctor side):
 *   4. Doctor receives the share package (string) and their own wallet address.
 *   5. verifyAndDecryptPackage() checks hasAccess() on the smart contract.
 *   6. If access is valid, the summary is decrypted and returned.
 *   7. If access is denied or expired, null is returned.
 *
 * Health data guarantees:
 *   ✓  Raw data never leaves the patient's browser in plain text.
 *   ✓  Only an encrypted summary is shared.
 *   ✓  The smart contract stores no health information.
 *   ✓  Decryption happens entirely in memory.
 */

import { encryptData, decryptData, type EncryptedPayload } from '@/lib/security/encryption'
import { getPatientData, type LocalPatientRecord }         from '@/lib/storage/localHealthStore'
import { grantAccess, revokeAccess, hasAccess }            from '@/lib/web3/consentContract'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatientSummary {
  fullName:    string
  age:         number | null
  gender:      string | null
  ldl:         number | null
  hdl:         number | null
  systolicBP:  number | null
  diastolicBP: number | null
  bmi:         number | null
  glucose:     number | null
  hba1c:       number | null
  sharedAt:    string          // ISO timestamp
}

export interface SharePackage {
  payload:        EncryptedPayload   // AES-GCM encrypted PatientSummary
  patientAddress: string
  expiresAt:      string             // ISO timestamp
  version:        '1'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSummary(record: LocalPatientRecord): PatientSummary {
  const { header: h, snapshot: s } = record
  return {
    fullName:    `${h.firstName} ${h.lastName}`.trim(),
    age:         h.age,
    gender:      h.gender,
    ldl:         s?.ldl         ?? null,
    hdl:         s?.hdl         ?? null,
    systolicBP:  s?.systolicBP  ?? null,
    diastolicBP: s?.diastolicBP ?? null,
    bmi:         s?.bmi         ?? null,
    glucose:     s?.glucose     ?? null,
    hba1c:       s?.hba1c       ?? null,
    sharedAt:    new Date().toISOString(),
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Encrypts a minimal, non-raw patient summary into a share package.
 * The package is a JSON string — safe to display as a QR code or copy-paste.
 */
export async function prepareSharePackage(
  patientAddress: string,
  expiryDate: Date,
): Promise<string> {
  const record = await getPatientData()
  if (!record) throw new Error('No local patient data found. Please reload the page.')

  const summary = buildSummary(record)
  const payload = await encryptData(summary)

  const pkg: SharePackage = {
    payload,
    patientAddress,
    expiresAt: expiryDate.toISOString(),
    version:   '1',
  }
  return JSON.stringify(pkg)
}

/**
 * Full sharing flow:
 *   1. Encrypts the patient summary.
 *   2. Records `grantAccess` on the smart contract.
 *   3. Returns the encrypted package string for delivery to the doctor.
 */
export async function grantDoctorAccess(
  patientAddress: string,
  doctorAddress:  string,
  expiryDate:     Date,
): Promise<string> {
  const pkg = await prepareSharePackage(patientAddress, expiryDate)
  await grantAccess(patientAddress, doctorAddress, expiryDate)
  return pkg
}

/**
 * Revokes a doctor's access via the smart contract.
 */
export async function revokeDoctorAccess(
  patientAddress: string,
  doctorAddress:  string,
): Promise<void> {
  await revokeAccess(patientAddress, doctorAddress)
}

/**
 * Doctor-side: verifies on-chain access then decrypts the share package.
 *
 * Returns the decrypted PatientSummary on success, or null if:
 *   - Access has expired or was never granted.
 *   - The package is malformed.
 *   - Decryption fails (wrong key — package not meant for this session).
 */
export async function verifyAndDecryptPackage(
  packageString:  string,
  patientAddress: string,
  doctorAddress:  string,
): Promise<PatientSummary | null> {
  const allowed = await hasAccess(patientAddress, doctorAddress)
  if (!allowed) return null

  try {
    const pkg = JSON.parse(packageString) as SharePackage
    if (pkg.version !== '1') return null
    const summary = await decryptData(pkg.payload)
    return summary as PatientSummary
  } catch {
    return null
  }
}
