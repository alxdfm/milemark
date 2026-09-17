import { formatUsdc } from "@/lib/milemark";

export function DeadlineLine({
  deadline,
  reclaimable,
}: {
  deadline: bigint;
  reclaimable: bigint;
}) {
  const ms = Number(deadline) * 1000;
  const expired = Date.now() > ms;
  const date = new Date(ms);
  const diff = Math.abs(ms - Date.now());
  const mins = Math.round(diff / 60000);
  const rel =
    mins < 60
      ? `${mins}m`
      : mins < 60 * 48
        ? `${Math.round(mins / 60)}h`
        : `${Math.round(mins / 60 / 24)}d`;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
      <span>
        Deadline {date.toLocaleString()}{" "}
        <span className="text-[10px] uppercase tracking-wider">
          ({Intl.DateTimeFormat().resolvedOptions().timeZone})
        </span>
      </span>
      <span
        className={
          expired
            ? "rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-200"
            : "rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent"
        }
      >
        {expired ? `Expired ${rel} ago` : `${rel} left`}
      </span>
      <span>· reclaimable {formatUsdc(reclaimable)} USDC</span>
    </p>
  );
}
