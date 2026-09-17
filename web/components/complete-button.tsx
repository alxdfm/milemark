"use client";

import { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/abi";
import { ESCROW_ADDRESS, explorerTx } from "@/lib/chains";
import { friendlyError } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [evidenceURI, setEvidenceURI] = useState("");
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receipt.isSuccess) onSettled?.();
  }, [receipt.isSuccess, onSettled]);

  const tx = hash ? explorerTx(hash) : undefined;

  return (
    <div className="flex w-full min-w-[12rem] flex-col items-stretch gap-2 sm:w-56">
      <Input
        placeholder="Evidence URI (optional)"
        value={evidenceURI}
        onChange={(e) => setEvidenceURI(e.target.value)}
        disabled={disabled || isPending || receipt.isLoading}
      />
      <Button
        size="sm"
        disabled={disabled || isPending || receipt.isLoading}
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
        {isPending || receipt.isLoading ? "Marking…" : "Mark complete"}
      </Button>
      {error && (
        <p className="text-right text-xs text-red-300">{friendlyError(error)}</p>
      )}
      {receipt.isSuccess && tx && (
        <a
          href={tx}
          target="_blank"
          rel="noreferrer"
          className="text-right text-xs text-accent hover:underline"
        >
          View tx
        </a>
      )}
    </div>
  );
}
