/**
 * Local-first patient data store backed by IndexedDB.
 *
 * All values are encrypted with AES-GCM before being written and decrypted
 * after being read (see lib/security/encryption.ts).  Nothing is ever
 * persisted in plain text.
 *
 * Schema
 *   DB: healthTwin  v1
 *   Object store: patientData  (keyPath: 'key')
 *     key: 'patient'   → EncryptedPayload wrapping LocalPatientRecord
 *
 * This module is client-only.  Import it only from 'use client' components.
 */

import { encryptData, decryptData, type EncryptedPayload } from '@/lib/security/encryption'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatientHeaderLocal {
  id: string
  firstName: string
  lastName: string
  age: number | null
  gender: string | null
}

export interface PatientSnapshotLocal {
  age: number | null
  gender: string | null
  ldl: number | null
  hdl: number | null
  systolicBP: number | null
  diastolicBP: number | null
  weight: number | null
  bmi: number | null
  glucose: number | null
  hba1c: number | null
}

export interface LocalPatientRecord {
  header:    PatientHeaderLocal
  snapshot:  PatientSnapshotLocal | null
  savedAt:   number   // Unix ms timestamp
}

// ── IDB bootstrap ─────────────────────────────────────────────────────────────

const DB_NAME    = 'healthTwin'
const DB_VERSION = 1
const STORE      = 'patientData'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ── Internal read / write ─────────────────────────────────────────────────────

async function idbGet(key: string): Promise<EncryptedPayload | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result?.payload ?? null)
    req.onerror   = () => reject(req.error)
  })
}

async function idbPut(key: string, payload: EncryptedPayload): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ key, payload })
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

const PATIENT_KEY = 'patient'

/** Encrypts and persists the full patient record. */
export async function savePatientData(data: LocalPatientRecord): Promise<void> {
  const payload = await encryptData(data)
  await idbPut(PATIENT_KEY, payload)
}

/**
 * Reads and decrypts the locally cached patient record.
 * Returns null if nothing is stored or the session key has been cleared.
 */
export async function getPatientData(): Promise<LocalPatientRecord | null> {
  try {
    const payload = await idbGet(PATIENT_KEY)
    if (!payload) return null
    return (await decryptData(payload)) as LocalPatientRecord
  } catch {
    // Decryption failure (e.g. session key rotated) — treat as cache miss.
    return null
  }
}

/**
 * Merges partial fields into the existing record.
 * Creates a new record if none exists.
 */
export async function updatePatientData(
  partial: Partial<LocalPatientRecord>,
): Promise<void> {
  const existing = await getPatientData()
  const merged: LocalPatientRecord = {
    header:   partial.header   ?? existing?.header   ?? { id: '', firstName: '', lastName: '', age: null, gender: null },
    snapshot: partial.snapshot ?? existing?.snapshot ?? null,
    savedAt:  Date.now(),
  }
  await savePatientData(merged)
}

/** Removes the encrypted record from IndexedDB. */
export async function clearPatientData(): Promise<void> {
  await idbDelete(PATIENT_KEY)
}
