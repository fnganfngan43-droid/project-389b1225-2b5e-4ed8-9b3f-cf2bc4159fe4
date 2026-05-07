/**
 * Native-aware storage layer.
 * - On Capacitor (Android/iOS): uses @capacitor-community/sqlite to persist
 *   the full app payload inside an on-device SQLite database (key/value table).
 * - On web/PWA: falls back to localStorage (preserves existing behaviour and
 *   allows Lovable preview to keep working unchanged).
 *
 * The payload itself is still encrypted by secureStorage.encryptString before
 * being handed to this layer, so we only deal with opaque strings here.
 */

import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'rafiq_accountant';
const TABLE = 'kv_store';

let sqlite: SQLiteConnection | null = null;
let dbPromise: Promise<SQLiteDBConnection> | null = null;

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function getDb(): Promise<SQLiteDBConnection> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    sqlite = sqlite || new SQLiteConnection(CapacitorSQLite);
    const consistent = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
    let db: SQLiteDBConnection;
    if (consistent.result && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    }
    await db.open();
    await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (
      k TEXT PRIMARY KEY NOT NULL,
      v TEXT NOT NULL
    );`);
    return db;
  })();
  return dbPromise;
}

export async function nativeGetItem(key: string): Promise<string | null> {
  if (!isNative()) return localStorage.getItem(key);
  try {
    const db = await getDb();
    const res = await db.query(`SELECT v FROM ${TABLE} WHERE k = ?;`, [key]);
    const row = res.values?.[0];
    return row ? (row.v as string) : null;
  } catch (e) {
    console.warn('SQLite get failed, falling back to localStorage', e);
    return localStorage.getItem(key);
  }
}

export async function nativeSetItem(key: string, value: string): Promise<void> {
  // Mirror to localStorage too so any synchronous reader still works.
  try { localStorage.setItem(key, value); } catch { /* quota */ }
  if (!isNative()) return;
  try {
    const db = await getDb();
    await db.run(
      `INSERT INTO ${TABLE} (k, v) VALUES (?, ?)
       ON CONFLICT(k) DO UPDATE SET v = excluded.v;`,
      [key, value]
    );
  } catch (e) {
    console.warn('SQLite set failed', e);
  }
}

export async function nativeRemoveItem(key: string): Promise<void> {
  try { localStorage.removeItem(key); } catch { /* noop */ }
  if (!isNative()) return;
  try {
    const db = await getDb();
    await db.run(`DELETE FROM ${TABLE} WHERE k = ?;`, [key]);
  } catch (e) {
    console.warn('SQLite remove failed', e);
  }
}

/** One-time migration of an existing localStorage value into SQLite. */
export async function migrateLocalStorageKey(key: string): Promise<void> {
  if (!isNative()) return;
  try {
    const existing = await nativeGetItem(key);
    if (existing) return;
    const ls = localStorage.getItem(key);
    if (ls) await nativeSetItem(key, ls);
  } catch (e) {
    console.warn('migrateLocalStorageKey failed', e);
  }
}

export const isNativeApp = isNative;
