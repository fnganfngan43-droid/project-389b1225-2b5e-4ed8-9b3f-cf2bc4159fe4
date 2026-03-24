import { useState, useCallback } from 'react';
import { useAccounting } from '@/contexts/AccountingContext';

export function useDuplicateReferenceCheck() {
  const { invoices, vouchers, discounts, currencyExchanges } = useAccounting();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [duplicateRef, setDuplicateRef] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const getAllReferences = useCallback((excludeId?: string): string[] => {
    const refs: string[] = [];
    
    invoices.forEach(inv => {
      if (inv.id !== excludeId && inv.reference) refs.push(inv.reference);
    });
    
    vouchers.forEach(v => {
      if (v.id !== excludeId) {
        if (v.debitReference) refs.push(v.debitReference);
        if (v.creditReference) refs.push(v.creditReference);
      }
    });
    
    discounts.forEach(d => {
      if (d.id !== excludeId && d.reference) refs.push(d.reference);
    });
    
    currencyExchanges.forEach(e => {
      if (e.id !== excludeId && e.reference) refs.push(e.reference);
    });
    
    return refs;
  }, [invoices, vouchers, discounts, currencyExchanges]);

  const checkAndProceed = useCallback((
    references: string[],
    excludeId: string | undefined,
    onProceed: () => void
  ) => {
    const allRefs = getAllReferences(excludeId);
    const duplicates = references.filter(ref => ref && allRefs.includes(ref));
    
    if (duplicates.length > 0) {
      setDuplicateRef(duplicates.join('، '));
      setPendingAction(() => onProceed);
      setDialogOpen(true);
    } else {
      onProceed();
    }
  }, [getAllReferences]);

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
