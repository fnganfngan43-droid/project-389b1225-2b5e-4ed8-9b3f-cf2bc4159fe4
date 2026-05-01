// Manages a persisted folder handle for backup storage using File System Access API.
// Falls back gracefully on unsupported environments (iOS Safari, WebView).

const DB_NAME = 'backup_folder_db';
const STORE = 'handles';
const KEY = 'backup_dir_handle';
const NAME_KEY = 'backup_folder_name';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function isFolderPickerSupported(): boolean {
  return typeof (window as any).showDirectoryPicker === 'function';
}

export async function pickBackupFolder(): Promise<string | null> {
  if (!isFolderPickerSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, KEY);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    localStorage.setItem(NAME_KEY, handle.name);
    return handle.name;
  } catch (e) {
    return null;
  }
}

export function getBackupFolderName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function clearBackupFolder() {
  localStorage.removeItem(NAME_KEY);
  openDB().then((db) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
  }).catch(() => {});
}

export async function getBackupFolderHandle(): Promise<any | null> {
  try {
    const db = await openDB();
    const handle: any = await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(KEY);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    if (!handle) return null;
    // Verify/refresh permission
    const perm = await handle.queryPermission?.({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const req = await handle.requestPermission?.({ mode: 'readwrite' });
      if (req !== 'granted') return null;
    }
    return handle;
  } catch {
    return null;
  }
}

export async function writeBackupToFolder(fileName: string, content: string): Promise<boolean> {
  const dir = await getBackupFolderHandle();
  if (!dir) return false;
  try {
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}
