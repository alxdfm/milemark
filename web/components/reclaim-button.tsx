"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/abi";
import { ESCROW_ADDRESS, explorerTx } from "@/lib/chains";
import { formatUsdc, friendlyError } from "@/lib/format";
import { Button } from "@/components/ui/button";

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
  const tx = hash ? explorerTx(hash) : undefined;

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
      {error && (
        <p className="text-xs text-red-300">{friendlyError(error)}</p>
      )}
      {receipt.isSuccess && tx && (
        <a
          href={tx}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent hover:underline"
        >
          View tx
        </a>
      )}
    </div>
  );
}
