export {
  formatUsdc,
  friendlyError,
  shortAddress,
  toBigInt,
} from "@/lib/milemark";

export function formatCountdown(
  deadlineSec: bigint | number | null | undefined,
  nowSec: number,
): string {
  if (deadlineSec === undefined || deadlineSec === null) return "—";
  const end = Number(deadlineSec);
  if (!Number.isFinite(end) || end <= 0) return "—";
  const delta = end - nowSec;
  if (delta <= 0) return "Deadline passed";
  const d = Math.floor(delta / 86400);
  const h = Math.floor((delta % 86400) / 3600);
  const m = Math.floor((delta % 3600) / 60);
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${Math.max(m, 0)}m remaining`;
}

export function formatUnix(ts: bigint | number | null | undefined): string {
  if (ts === undefined || ts === null) return "—";
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Date(n * 1000).toLocaleString();
}
