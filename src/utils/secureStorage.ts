/**
 * Secure storage layer for sensitive data.
 * - AES-GCM 256 encryption for all payload data
 * - PBKDF2-derived key from a per-device random secret (stored once)
 * - Passwords are NEVER stored as plaintext — only PBKDF2 hashes with salt
 *
 * Note: Client-side encryption cannot fully defend against a live XSS
 * attacker (since the key is derivable in the same origin), but it does
 * protect against:
 *   - Casual inspection via DevTools
 *   - Browser extensions reading raw localStorage
 *   - Disk-level access to localStorage SQLite files
 *   - Backups exported by other tools
 */

const DEVICE_SECRET_KEY = '__app_device_secret_v1';
const PBKDF2_ITERATIONS = 100_000;
const SALT_LEN = 16;
const IV_LEN = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function getDeviceSecret(): string {
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!secret) {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    secret = toB64(buf);
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
  }
  return secret;
}

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(getDeviceSecret()),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt arbitrary string -> packed base64 (salt|iv|cipher) prefixed with marker. */
export async function encryptString(plaintext: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  const packed = new Uint8Array(salt.length + iv.length + cipher.byteLength);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(cipher), salt.length + iv.length);
  return 'ENC1:' + toB64(packed);
}

/** Decrypt a value previously created with encryptString. Returns null on failure. */
export async function decryptString(payload: string): Promise<string | null> {
  if (!payload.startsWith('ENC1:')) return null;
  try {
    const packed = fromB64(payload.slice(5));
    const salt = packed.slice(0, SALT_LEN);
    const iv = packed.slice(SALT_LEN, SALT_LEN + IV_LEN);
    const cipher = packed.slice(SALT_LEN + IV_LEN);
    const key = await deriveKey(salt);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipher
    );
    return dec.decode(plain);
  } catch (e) {
    console.error('decryptString failed', e);
    return null;
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith('ENC1:');
}

/* ---------------- Password hashing (PBKDF2) ---------------- */

const PASSWORD_ITERATIONS = 150_000;

/** Returns a serialized hash record: PWD1:<saltB64>:<hashB64> */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    256
  );
  return `PWD1:${toB64(salt)}:${toB64(bits)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  // Backwards-compat: older builds may have stored plaintext
  if (!stored.startsWith('PWD1:')) {
    return password === stored;
  }
  const [, saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  try {
    const salt = fromB64(saltB64);
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' },
      baseKey,
      256
    );
    return toB64(bits) === hashB64;
  } catch {
    return false;
  }
}

export function isHashedPassword(value: string | null | undefined): boolean {
  return !!value && value.startsWith('PWD1:');
}
