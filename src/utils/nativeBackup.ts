// Native (Android/Capacitor) backup storage helpers.
// Handles storage read/write permissions and writing backup files
// to a user-selected device folder. Falls back silently on web.

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export type NativeDirKey = 'DOCUMENTS' | 'EXTERNAL_STORAGE' | 'EXTERNAL' | 'DATA';

export interface NativeBackupTarget {
  directory: NativeDirKey;
  subfolder: string; // may be empty
}

const TARGET_KEY = 'native_backup_target';

export const NATIVE_DIR_OPTIONS: { key: NativeDirKey; label: string }[] = [
  { key: 'DOCUMENTS', label: 'المستندات (Documents)' },
  { key: 'EXTERNAL_STORAGE', label: 'الذاكرة الداخلية (Internal storage)' },
  { key: 'EXTERNAL', label: 'ملفات التطبيق العامة (Android/data)' },
  { key: 'DATA', label: 'مساحة التطبيق الخاصة (Private)' },
];

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function toDirectory(key: NativeDirKey): Directory {
  switch (key) {
    case 'DOCUMENTS':
      return Directory.Documents;
    case 'EXTERNAL_STORAGE':
      return Directory.ExternalStorage;
    case 'EXTERNAL':
      return Directory.External;
    default:
      return Directory.Data;
  }
}

/** Request read/write storage permissions, returns true when granted. */
export async function ensureStoragePermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const status = await Filesystem.checkPermissions();
    if (status.publicStorage === 'granted') return true;
    const req = await Filesystem.requestPermissions();
    return req.publicStorage === 'granted';
  } catch {
    // Some Android versions (scoped storage) resolve without the permission API
    return true;
  }
}

export function getNativeTarget(): NativeBackupTarget | null {
  try {
    const raw = localStorage.getItem(TARGET_KEY);
    return raw ? (JSON.parse(raw) as NativeBackupTarget) : null;
  } catch {
    return null;
  }
}

export function clearNativeTarget() {
  localStorage.removeItem(TARGET_KEY);
}

export function describeNativeTarget(t: NativeBackupTarget): string {
  const label = NATIVE_DIR_OPTIONS.find((o) => o.key === t.directory)?.label ?? t.directory;
  return t.subfolder ? `${label} / ${t.subfolder}` : label;
}

/**
 * Selects and verifies a backup folder: asks for permission, creates the
 * folder if needed and performs a write test so success is confirmed.
 */
export async function selectNativeBackupFolder(
  directory: NativeDirKey,
  subfolder: string
): Promise<{ ok: boolean; label?: string; error?: string }> {
  if (!isNativePlatform()) return { ok: false, error: 'غير مدعوم على هذا الجهاز' };

  const granted = await ensureStoragePermission();
  if (!granted) return { ok: false, error: 'تم رفض إذن الوصول إلى ذاكرة الهاتف' };

  const dir = toDirectory(directory);
  const path = (subfolder || '').replace(/^\/+|\/+$/g, '');

  try {
    if (path) {
      try {
        await Filesystem.mkdir({ path, directory: dir, recursive: true });
      } catch {
        /* already exists */
      }
    }
    // Write test to confirm the folder is really writable
    const probe = path ? `${path}/.write-test` : '.write-test';
    await Filesystem.writeFile({
      path: probe,
      data: 'ok',
      directory: dir,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    await Filesystem.deleteFile({ path: probe, directory: dir }).catch(() => {});

    const target: NativeBackupTarget = { directory, subfolder: path };
    localStorage.setItem(TARGET_KEY, JSON.stringify(target));
    return { ok: true, label: describeNativeTarget(target) };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'تعذر الكتابة في المجلد المختار' };
  }
}

/** Writes a backup file into the saved native folder. Returns the file URI on success. */
export async function writeNativeBackup(fileName: string, content: string): Promise<string | null> {
  if (!isNativePlatform()) return null;
  const target = getNativeTarget();
  if (!target) return null;
  const granted = await ensureStoragePermission();
  if (!granted) return null;

  const dir = toDirectory(target.directory);
  const path = target.subfolder ? `${target.subfolder}/${fileName}` : fileName;
  try {
    const res = await Filesystem.writeFile({
      path,
      data: content,
      directory: dir,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return res.uri || path;
  } catch {
    return null;
  }
}
