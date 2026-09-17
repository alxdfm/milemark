"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { milestoneEscrowAbi } from "@/lib/abi";
import { ESCROW_ADDRESS } from "@/lib/chains";
import { friendlyError } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function CompleteButton({
  campaignId,
  index,
  disabled,
  onSettled,
}: {
  campaignId: bigint;
  index: number;
  disabled?: boolean;
  onSettled?: () => void;
}) {
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receipt.isSuccess) onSettled?.();
  }, [receipt.isSuccess, onSettled]);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={disabled || isPending || receipt.isLoading}
        onClick={() => {
          reset();
          writeContract({
            address: ESCROW_ADDRESS,
            abi: milestoneEscrowAbi,
            functionName: "completeMilestone",
            args: [campaignId, BigInt(index)],
          });
        }}
      >
        {isPending || receipt.isLoading ? "Marking…" : "Mark complete"}
      </Button>
      {error && (
        <p className="max-w-[14rem] text-right text-xs text-red-300">
          {friendlyError(error)}
        </p>
      )}
    </div>
  );
}
