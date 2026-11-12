/** Normalise a Zambian mobile number to 260XXXXXXXXX (no +). Returns null if invalid. */
export function normalizeZmPhone(input: unknown): string | null {
  let p = String(input ?? '').replace(/[\s\-()]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '260' + p.slice(1);
  else if (/^[79]\d{8}$/.test(p)) p = '260' + p;
  // Airtel 97/77, MTN 96/76, Zamtel 95/75
  return /^260(9[567]|7[567])\d{7}$/.test(p) ? p : null;
}

export function parseAmount(input: unknown): number | null {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}
