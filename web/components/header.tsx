import Link from "next/link";
import { ConnectWallet } from "@/components/connect-wallet";
import { DEMO_CAMPAIGN_ID } from "@/lib/contracts";
import { milemarkChain } from "@/lib/chains";

function MileMarker({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 48"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect x="2" y="2" width="32" height="44" rx="4" fill="#e6ff4d" />
      <rect x="7" y="8" width="22" height="4" rx="1" fill="#0c0d0b" />
      <path
        d="M18 20v16"
        stroke="#0c0d0b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="18" cy="20" r="3.5" fill="#0c0d0b" />
      <circle cx="18" cy="28" r="2.2" fill="#0c0d0b" />
      <circle cx="18" cy="36" r="2.2" fill="#0c0d0b" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <MileMarker className="h-8 w-6" />
          <span className="font-display text-lg font-semibold tracking-tight">
            MileMark
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/create"
            className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            Create
          </Link>
          <Link
            href={`/campaign/${DEMO_CAMPAIGN_ID}`}
            className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            Demo
          </Link>
          <span className="hidden rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline">
            {milemarkChain.name}
          </span>
          <ConnectWallet />
        </nav>
      </div>
    </header>
  );
}
