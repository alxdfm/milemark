import { isEscrowConfigured, milemarkChain } from "@/lib/chains";

export function ConfigBanner() {
  if (isEscrowConfigured) return null;
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
      Escrow address is not set. Copy{" "}
      <code className="font-mono text-xs">web/.env.example</code> to{" "}
      <code className="font-mono text-xs">web/.env.local</code> and fill{" "}
      <code className="font-mono text-xs">NEXT_PUBLIC_ESCROW_ADDRESS</code> after
      deploying to {milemarkChain.name}. Reads and writes will stay disabled until
      then.
    </div>
  );
}
