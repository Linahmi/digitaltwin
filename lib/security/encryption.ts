/**
 * AES-GCM-256 encryption via the browser Web Crypto API.
 *
 * Key lifecycle:
 *   - Generated fresh on the first call within a browser session.
 *   - Exported (raw) and kept in sessionStorage so it survives page
 *     refreshes within the same tab, but is discarded when the browser
 *     (or tab) closes.  Data stored in IndexedDB therefore becomes
 *     unreadable without the key — this is intentional.
 *
 * Optional wallet-derived key:
 *   - Call deriveKeyFromSignature(sig) after the user signs a known
 *     message with their wallet.  This produces a deterministic key
 *     that survives across sessions (the same wallet always produces
 *     the same key) and is never stored anywhere.
 *
 * All functions are async and safe to call concurrently.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_KEY_SLOT = 'healthTwin_aesKey'
const ALGO             = 'AES-GCM'
const KEY_BITS         = 256
const IV_BYTES         = 12   // 96-bit IV recommended for AES-GCM

// ── Helpers ───────────────────────────────────────────────────────────────────

function u8ToB64(u8: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...u8))
}

// TypeScript 5.7+ made Uint8Array generic (ArrayBufferLike by default).
// Web Crypto APIs require the stricter ArrayBuffer variant, so we build the
// array manually via new Uint8Array(N) which allocates a fresh ArrayBuffer.
function b64ToU8(s: string): Uint8Array<ArrayBuffer> {
  const binary = atob(s)
  const u8     = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i)
  return u8
}

// ── Key management ────────────────────────────────────────────────────────────

/**
 * Returns the session encryption key, creating and persisting it if needed.
 * The raw key bytes live only in sessionStorage (cleared on tab close).
 */
async function getSessionKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(SESSION_KEY_SLOT)
  if (stored) {
    const raw = b64ToU8(stored)
    return crypto.subtle.importKey(
      'raw', raw,
      { name: ALGO, length: KEY_BITS },
      false,
      ['encrypt', 'decrypt'],
    )
  }
  const key = await crypto.subtle.generateKey(
    { name: ALGO, length: KEY_BITS },
    true,
    ['encrypt', 'decrypt'],
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  sessionStorage.setItem(SESSION_KEY_SLOT, u8ToB64(new Uint8Array(exported) as Uint8Array<ArrayBuffer>))
  return key
}

/**
 * Derives a deterministic AES-GCM key from a wallet signature string.
 * The derived key is NOT stored; callers should cache it in memory for the
 * session if repeated use is expected.
 *
 * Usage:
 *   const sig = await signer.signMessage('Health Twin key v1')
 *   const key = await deriveKeyFromSignature(sig)
 */
export async function deriveKeyFromSignature(signature: string): Promise<CryptoKey> {
  const sigBytes = new TextEncoder().encode(signature) as Uint8Array<ArrayBuffer>
  const baseKey  = await crypto.subtle.importKey('raw', sigBytes, 'PBKDF2', false, ['deriveKey'])
  const salt     = new TextEncoder().encode('healthTwin:v1') as Uint8Array<ArrayBuffer>
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    baseKey,
    { name: ALGO, length: KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  iv: string   // base64-encoded 12-byte IV
  ct: string   // base64-encoded ciphertext + GCM auth tag
}

/**
 * Encrypts any JSON-serialisable value.
 * Pass an explicit key to use wallet-derived encryption instead of the
 * session key (e.g. for share packages that a doctor must decrypt).
 */
export async function encryptData(
  plaintext: unknown,
  key?: CryptoKey,
): Promise<EncryptedPayload> {
  const k  = key ?? await getSessionKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES)) as Uint8Array<ArrayBuffer>
  const ct = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    k,
    new TextEncoder().encode(JSON.stringify(plaintext)) as Uint8Array<ArrayBuffer>,
  )
  return { iv: u8ToB64(iv), ct: u8ToB64(new Uint8Array(ct) as Uint8Array<ArrayBuffer>) }
}

/**
 * Decrypts a payload produced by encryptData.
 * Decryption happens entirely in memory — the plaintext is never persisted.
 */
export async function decryptData(
  payload: EncryptedPayload,
  key?: CryptoKey,
): Promise<unknown> {
  const k         = key ?? await getSessionKey()
  const iv        = b64ToU8(payload.iv)
  const ct        = b64ToU8(payload.ct)
  const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, k, ct)
  return JSON.parse(new TextDecoder().decode(plaintext))
}

/**
 * Removes the session key from sessionStorage.
 * Existing IndexedDB ciphertext becomes permanently unreadable.
 * Call this on explicit "log out" / "clear data" user action.
 */
export function clearSessionKey(): void {
  sessionStorage.removeItem(SESSION_KEY_SLOT)
}
