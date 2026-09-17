"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/abi";
import { ESCROW_ADDRESS, explorerTx } from "@/lib/chains";
import { friendlyError, formatUsdc } from "@/lib/format";
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

  const tx = hash ? explorerTx(hash) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        variant="secondary"
        disabled={disabled || amount === 0n || isPending || receipt.isLoading}
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
        {isPending || receipt.isLoading
          ? "Reclaiming…"
          : `Reclaim ${formatUsdc(amount)} USDC`}
      </Button>
      {error && <p className="text-sm text-red-300">{friendlyError(error)}</p>}
      {receipt.isSuccess && (
        <p className="text-sm text-accent">
          Reclaim confirmed.
          {tx ? (
            <>
              {" "}
              <a href={tx} target="_blank" rel="noreferrer" className="underline">
                View tx
              </a>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
