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

// Fallback for Android WebView / mobile browsers: open the phone's file manager
// via a directory input so the user can point to a folder. Only the name can be
// captured (no write access), downloads still go to the share sheet / Downloads.
export function pickBackupFolderFallback(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const f = input.files?.[0] as any;
      const rel: string = f?.webkitRelativePath || '';
      const name = rel ? rel.split('/')[0] : null;
      if (name) localStorage.setItem(NAME_KEY, name);
      document.body.removeChild(input);
      resolve(name);
    };
    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };
    input.click();
  });
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
