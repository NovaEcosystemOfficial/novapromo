import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const FALLBACK_BRANDS = [
  { id: 'nova-promo', brandId: 'nova-promo', name: 'NovaPromo', color: '#f97316' },
  { id: 'nova-ecosystem', brandId: 'nova-ecosystem', name: 'Nova Ecosystem', color: '#7c3aed' },
];

export const CUSTOM_PROJECT_ID = '__custom__';

const FIREBASE_UID_PATTERN = /^[A-Za-z0-9]{20,}$/;

function looksLikeFirebaseUid(value) {
  return typeof value === 'string' && FIREBASE_UID_PATTERN.test(value) && !value.includes('-');
}

const KNOWN_BRAND_NAMES = {
  'nova-promo': 'NovaPromo',
  'nova-ecosystem': 'Nova Ecosystem',
};

/** Normalizza nome progetto — mai mostrare UID grezzo. */
export function normalizeBrandDisplayName(brand) {
  const companyName = brand?.identity?.companyName?.trim();
  if (companyName && !looksLikeFirebaseUid(companyName)) return companyName;

  const rawName = typeof brand?.name === 'string' ? brand.name.trim() : '';
  if (rawName && !looksLikeFirebaseUid(rawName)) return rawName;

  const id = brand?.brandId || brand?.id;
  if (id && KNOWN_BRAND_NAMES[id]) return KNOWN_BRAND_NAMES[id];

  if (looksLikeFirebaseUid(rawName) || looksLikeFirebaseUid(id)) {
    return 'Il mio brand';
  }

  return rawName || KNOWN_BRAND_NAMES[id] || 'Progetto';
}

export function normalizeBrandList(brands) {
  if (!Array.isArray(brands)) return FALLBACK_BRANDS;

  return brands
    .map((b) => ({
      ...b,
      brandId: b.brandId || b.id,
      name: normalizeBrandDisplayName(b),
    }))
    .filter((b) => b.brandId && b.name && !looksLikeFirebaseUid(b.name));
}

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
        const list = data?.brands?.length
          ? normalizeBrandList(data.brands)
          : FALLBACK_BRANDS;
        setBrands(list.length ? list : FALLBACK_BRANDS);
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
