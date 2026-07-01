import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { isDemoMode } from '../lib/features.js';
import { getDemoBillingStatus } from '../lib/plans.js';

const BillingContext = createContext(null);

export function BillingProvider({ children }) {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshBilling = useCallback(async () => {
    if (isDemoMode()) {
      setBilling(getDemoBillingStatus());
      setLoading(false);
      return;
    }
    try {
      const data = await api.getBillingStatus();
      setBilling(data);
    } catch {
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBilling();
  }, [refreshBilling]);

  return (
    <BillingContext.Provider value={{ billing, loading, refreshBilling }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
}
