"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/contracts";
import { ESCROW_ADDRESS } from "@/lib/chains";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "@/components/tx-feedback";

export function DisputeButton({
  campaignId,
  index,
  disabled,
  reason,
  onSettled,
}: {
  campaignId: bigint;
  index: number;
  disabled?: boolean;
  reason?: string | null;
  onSettled?: () => void;
}) {
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receipt.isSuccess) onSettled?.();
  }, [receipt.isSuccess, onSettled]);

  const waiting = isPending || receipt.isLoading;

  return (
    <div className="flex w-full max-w-xs flex-col items-stretch gap-2 sm:items-end">
      <Button
        size="sm"
        variant="danger"
        disabled={disabled || waiting}
        title={reason ?? undefined}
        onClick={() => {
          reset();
          writeContract({
            address: ESCROW_ADDRESS,
            abi: milestoneEscrowAbi,
            functionName: "dispute",
            args: [campaignId, BigInt(index)],
          });
        }}
      >
        {waiting ? "Disputing…" : "Dispute"}
      </Button>
      {reason ? <p className="text-xs text-muted">{reason}</p> : null}
      <TxFeedback
        hash={hash}
        error={error}
        isPending={isPending}
        isConfirming={receipt.isLoading}
        isSuccess={receipt.isSuccess}
        successLabel="Milestone disputed — claim blocked."
      />
    </div>
  );
}
