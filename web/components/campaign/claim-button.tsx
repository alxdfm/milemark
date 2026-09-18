"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/contracts";
import { ESCROW_ADDRESS } from "@/lib/chains";
import { formatUsdc } from "@/lib/milemark";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "@/components/tx-feedback";

export function ClaimButton({
  campaignId,
  amount,
  disabled,
  label,
  onSettled,
}: {
  campaignId: bigint;
  amount: bigint;
  disabled?: boolean;
  label?: string;
  onSettled?: () => void;
}) {
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receipt.isSuccess) onSettled?.();
  }, [receipt.isSuccess, onSettled]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        disabled={disabled || amount === 0n || isPending || receipt.isLoading}
        onClick={() => {
          reset();
          writeContract({
            address: ESCROW_ADDRESS,
            abi: milestoneEscrowAbi,
            functionName: "claim",
            args: [campaignId],
          });
        }}
      >
        {isPending || receipt.isLoading
          ? "Claiming…"
          : (label ?? `Claim ${formatUsdc(amount)} USDC`)}
      </Button>
      <TxFeedback
        hash={hash}
        error={error}
        isPending={isPending}
        isConfirming={receipt.isLoading}
        isSuccess={receipt.isSuccess}
        successLabel="Claim confirmed onchain."
      />
    </div>
  );
}
