/**
 * Recursively remove `undefined` values so Firestore accepts the payload.
 * Keeps `null`, primitives, arrays, and plain objects.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export function sanitizeForFirestore(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined) continue;
      const sanitized = sanitizeForFirestore(val);
      if (sanitized !== undefined) {
        out[key] = sanitized;
      }
    }
    return out;
  }

  return value;
}

/**
 * Returns true if `value` contains any nested `undefined` (Firestore-invalid).
 * @param {unknown} value
 */
export function hasUndefinedDeep(value, seen = new Set()) {
  if (value === undefined) return true;
  if (value === null || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => hasUndefinedDeep(item, seen));
  }

  return Object.values(value).some((v) => hasUndefinedDeep(v, seen));
}
