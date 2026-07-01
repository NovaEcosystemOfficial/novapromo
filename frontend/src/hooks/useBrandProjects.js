import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const FALLBACK_BRANDS = [
  { id: 'nova-promo', brandId: 'nova-promo', name: 'NovaPromo', color: '#f97316' },
  { id: 'nova-ecosystem', brandId: 'nova-ecosystem', name: 'Nova Ecosystem', color: '#7c3aed' },
];

export const CUSTOM_PROJECT_ID = '__custom__';

export function resolveProjectLabel({ brandId, project, customProject, brands }) {
  if (brandId === CUSTOM_PROJECT_ID) {
    return String(customProject || project || '').trim();
  }
  const match = brands?.find((b) => b.brandId === brandId || b.id === brandId);
  return match?.name || project || '';
}

export function useBrandProjects() {
  const [brands, setBrands] = useState(FALLBACK_BRANDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getBrands()
      .then((data) => {
        if (cancelled) return;
        const list = data?.brands?.length ? data.brands : FALLBACK_BRANDS;
        setBrands(list);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setBrands(FALLBACK_BRANDS);
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { brands, loading, error };
}
