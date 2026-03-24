import { useState, useCallback } from 'react';

export function useDuplicateReferenceCheck() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [duplicateRef, setDuplicateRef] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkAndProceed = useCallback((
    references: string[],
    existingReferences: string[],
    onProceed: () => void
  ) => {
    const duplicates = references.filter(ref => ref && existingReferences.includes(ref));
    
    if (duplicates.length > 0) {
      setDuplicateRef(duplicates.join('، '));
      setPendingAction(() => onProceed);
      setDialogOpen(true);
    } else {
      onProceed();
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setDialogOpen(false);
    pendingAction?.();
    setPendingAction(null);
  }, [pendingAction]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setPendingAction(null);
  }, []);

  return {
    dialogOpen,
    duplicateRef,
    checkAndProceed,
    handleConfirm,
    handleCancel,
  };
}
