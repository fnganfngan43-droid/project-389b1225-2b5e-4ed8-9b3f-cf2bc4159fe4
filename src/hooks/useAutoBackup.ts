import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { writeBackupToFolder, getBackupFolderHandle } from '@/utils/backupFolder';
import { decryptString, isEncrypted } from '@/utils/secureStorage';

const AUTO_BACKUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const LAST_AUTO_BACKUP_KEY = 'last_auto_backup_time';
const AUTO_BACKUP_ENABLED_KEY = 'auto_backup_enabled';

function recordBackupTimestamp() {
  const now = new Date();
  const displayDate = now.toLocaleDateString('ar-SA') + ' ' + now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  localStorage.setItem('last_backup_date', displayDate);
  localStorage.setItem(LAST_AUTO_BACKUP_KEY, Date.now().toString());
}

export async function triggerBackupDownload(): Promise<boolean> {
  try {
    const data = localStorage.getItem('accounting_data');
    if (!data) return false;

    // Try saved folder first
    const dir = await getBackupFolderHandle();
    if (dir) {
      const ts = new Date();
      const fileName = `نسخة المحاسب - ${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}.json`;
      const ok = await writeBackupToFolder(fileName, data);
      if (ok) {
        recordBackupTimestamp();
        return true;
      }
    }

    // Fallback: regular browser download
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نسخة المحاسب.json';
    a.click();
    URL.revokeObjectURL(url);

    recordBackupTimestamp();
    return true;
  } catch {
    return false;
  }
}

export function isAutoBackupEnabled(): boolean {
  return localStorage.getItem(AUTO_BACKUP_ENABLED_KEY) !== 'false';
}

export function setAutoBackupEnabled(enabled: boolean) {
  localStorage.setItem(AUTO_BACKUP_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function useAutoBackup() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkAndBackup = useCallback(async () => {
    if (!isAutoBackupEnabled()) return;

    const lastBackup = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
    const now = Date.now();

    if (!lastBackup || (now - parseInt(lastBackup)) >= AUTO_BACKUP_INTERVAL) {
      const success = await triggerBackupDownload();
      if (success) {
        toast.success('تم حفظ نسخة احتياطية تلقائية - نسخة المحاسب', { duration: 3000 });
      }
    }
  }, []);

  useEffect(() => {
    // Check on mount after a short delay
    const timeout = setTimeout(checkAndBackup, 5000);

    // Set interval for periodic checks
    intervalRef.current = setInterval(checkAndBackup, AUTO_BACKUP_INTERVAL);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkAndBackup]);
}
