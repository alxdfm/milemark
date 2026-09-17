import { formatUsdc } from "@/lib/milemark";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "@/components/tx-feedback";

export function FundActions({
  isConnected,
  needsApproval,
  waiting,
  action,
  settledAction,
  total,
  balance,
  insufficient,
  hash,
  error,
  isPending,
  isConfirming,
  isSuccess,
  onApprove,
  onCreate,
}: {
  isConnected: boolean;
  needsApproval: boolean;
  waiting: boolean;
  action: "approve" | "create" | null;
  settledAction: "approve" | "create" | null;
  total: bigint;
  balance: bigint | undefined;
  insufficient: boolean;
  hash?: `0x${string}`;
  error?: unknown;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  onApprove: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-lg border border-dashed border-line bg-ink px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted">Total locked</span>
        <span className="font-mono text-lg text-accent">
          {formatUsdc(total)} USDC
        </span>
      </div>

      {isConnected && balance !== undefined && (
        <p className="text-xs text-muted">
          Wallet balance: {formatUsdc(balance)} USDC
          {insufficient ? " — not enough to fund this campaign." : ""}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {needsApproval ? (
          <Button
            type="button"
            onClick={onApprove}
            disabled={!isConnected || waiting || total === 0n || insufficient}
            className="sm:flex-1"
          >
            {waiting && action === "approve"
              ? "Confirm in wallet…"
              : `Approve ${formatUsdc(total)} USDC`}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onCreate}
            disabled={!isConnected || waiting || total === 0n || insufficient}
            className="sm:flex-1"
          >
            {waiting && action === "create" ? "Locking USDC…" : "Create campaign"}
          </Button>
        )}
      </div>

      <TxFeedback
        hash={hash}
        error={error}
        isPending={isPending}
        isConfirming={isConfirming}
        isSuccess={isSuccess}
        successLabel={
          (action ?? settledAction) === "approve"
            ? "Allowance confirmed."
            : "Campaign created onchain."
        }
      />
    </div>
  );
}
