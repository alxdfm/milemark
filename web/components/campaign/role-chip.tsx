export function RoleChip({ label, mine }: { label: string; mine: boolean }) {
  return (
    <span
      className={
        mine
          ? "rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent"
          : "rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted"
      }
    >
      {label}
      {mine ? " · you" : ""}
    </span>
  );
}
