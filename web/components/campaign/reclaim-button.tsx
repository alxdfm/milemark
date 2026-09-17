"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/contracts";
import { ESCROW_ADDRESS } from "@/lib/chains";
import { formatUsdc } from "@/lib/milemark";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "@/components/tx-feedback";

export function ReclaimButton({
  campaignId,
  amount,
  disabled,
  onSettled,
}: {
  campaignId: bigint;
  amount: bigint;
  disabled?: boolean;
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
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={disabled || waiting || amount === 0n}
        onClick={() => {
          reset();
          writeContract({
            address: ESCROW_ADDRESS,
            abi: milestoneEscrowAbi,
            functionName: "reclaim",
            args: [campaignId],
          });
        }}
      >
        {waiting ? "Reclaiming…" : `Reclaim ${formatUsdc(amount)} USDC`}
      </Button>
      <TxFeedback
        hash={hash}
        error={error}
        isPending={isPending}
        isConfirming={receipt.isLoading}
        isSuccess={receipt.isSuccess}
        successLabel="Reclaim confirmed onchain."
      />
    </div>
  );
}
