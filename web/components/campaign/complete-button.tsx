"use client";

import { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/contracts";
import { ESCROW_ADDRESS } from "@/lib/chains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TxFeedback } from "@/components/tx-feedback";

export function CompleteButton({
  campaignId,
  index,
  disabled,
  showAttestorHint,
  onSettled,
}: {
  campaignId: bigint;
  index: number;
  disabled?: boolean;
  /** Open mile, wallet missing or not a listed attestor. */
  showAttestorHint?: boolean;
  onSettled?: () => void;
}) {
  const [evidenceURI, setEvidenceURI] = useState("");
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receipt.isSuccess) onSettled?.();
  }, [receipt.isSuccess, onSettled]);

  const waiting = isPending || receipt.isLoading;

  return (
    <div className="flex w-full max-w-xs flex-col items-stretch gap-2 sm:items-end">
      <Input
        placeholder="evidence URI (optional)"
        value={evidenceURI}
        onChange={(e) => setEvidenceURI(e.target.value)}
        disabled={disabled || waiting}
        className="h-8 text-xs"
      />
      <Button
        size="sm"
        disabled={disabled || waiting}
        onClick={() => {
          reset();
          writeContract({
            address: ESCROW_ADDRESS,
            abi: milestoneEscrowAbi,
            functionName: "completeMilestone",
            args: [campaignId, BigInt(index), evidenceURI.trim()],
          });
        }}
      >
        {waiting ? "Confirm…" : "Mark complete"}
      </Button>
      {showAttestorHint && (
        <p className="text-xs text-muted">
          Connect a listed attestor wallet to mark complete.
        </p>
      )}
      <TxFeedback
        hash={hash}
        error={error}
        isPending={isPending}
        isConfirming={receipt.isLoading}
        isSuccess={receipt.isSuccess}
        successLabel="Milestone marked complete."
      />
    </div>
  );
}
