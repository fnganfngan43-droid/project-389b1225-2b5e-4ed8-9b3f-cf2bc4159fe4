import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const AUTO_BACKUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const LAST_AUTO_BACKUP_KEY = 'last_auto_backup_time';
const AUTO_BACKUP_ENABLED_KEY = 'auto_backup_enabled';

export function triggerBackupDownload() {
  try {
    const data = localStorage.getItem('accounting_data');
    if (!data) return false;

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نسخ المحاسب المحبوب/نسخة المحاسب.json';
    a.click();
    URL.revokeObjectURL(url);

    const now = new Date();
    const displayDate = now.toLocaleDateString('ar-SA') + ' ' + now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem('last_backup_date', displayDate);
    localStorage.setItem(LAST_AUTO_BACKUP_KEY, Date.now().toString());
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

  const checkAndBackup = useCallback(() => {
    if (!isAutoBackupEnabled()) return;

    const lastBackup = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
    const now = Date.now();

    if (!lastBackup || (now - parseInt(lastBackup)) >= AUTO_BACKUP_INTERVAL) {
      const success = triggerBackupDownload();
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
