/** Normalise a Zambian mobile number to E.164 (+260XXXXXXXXX). Returns null if it is not valid. */
export function toE164Zm(input: string): string | null {
  let p = (input || '').replace(/[\s\-()]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '260' + p.slice(1);
  else if (/^[79]\d{8}$/.test(p)) p = '260' + p;
  // Airtel 97/77 · MTN 96/76 · Zamtel 95/75
  return /^260(9[567]|7[567])\d{7}$/.test(p) ? `+${p}` : null;
}

/** +260971234567 → 097 123 4567 (for display / prefilling inputs) */
export function toLocalZm(e164?: string | null): string {
  if (!e164) return '';
  const d = e164.replace(/\D/g, '');
  if (!d.startsWith('260') || d.length !== 12) return e164;
  const n = '0' + d.slice(3);
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}
