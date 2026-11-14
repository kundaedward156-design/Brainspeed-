export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s';
  const total = Math.round(ms / 100) / 10;
  if (total < 60) return `${total.toFixed(total % 1 === 0 ? 0 : 1)}s`;
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  return `${m}m ${s}s`;
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function initials(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** 1234 → "1.2K", 2500000 → "2.5M". Used for player counts. */
export function formatCount(n?: number | null): string {
  const v = Math.max(0, Math.round(Number(n) || 0));
  if (v < 1000) return String(v);
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(v / 1_000_000).toFixed(v < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}M`;
}
