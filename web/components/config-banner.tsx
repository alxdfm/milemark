"use client";

import type { ReactNode } from "react";
import { isEscrowConfigured, milemarkChain } from "@/lib/chains";
import { useConfigWarnings } from "@/hooks/use-config-warnings";

function Banner({
  tone,
  children,
}: {
  tone: "amber" | "red";
  children: ReactNode;
}) {
  const cls =
    tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return (
    <div className={`border-b px-4 py-2 text-center text-sm ${cls}`}>{children}</div>
  );
}

export function ConfigBanner() {
  const warnings = useConfigWarnings();

  return (
    <>
      {!isEscrowConfigured ? (
        <Banner tone="amber">
          Escrow address is not set. Copy{" "}
          <code className="font-mono text-xs">web/.env.example</code> to{" "}
          <code className="font-mono text-xs">web/.env.local</code> and fill{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_ESCROW_ADDRESS</code> after
          deploying to {milemarkChain.name}. Reads and writes will stay disabled until
          then.
        </Banner>
      ) : null}
      {warnings.map((warning) => (
        <Banner key={warning.id} tone="amber">
          <span className="font-medium">{warning.title}.</span> {warning.body} This
          banner does not block the app.
        </Banner>
      ))}
    </>
  );
}
