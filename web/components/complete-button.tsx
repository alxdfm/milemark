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

  const waiting = isPending || receipt.isLoading;
  const tx = hash ? explorerTx(hash) : undefined;

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
      {disabled && (
        <p className="text-xs text-muted">
          Connect a listed attestor wallet to mark complete.
        </p>
      )}
      {error && <p className="text-xs text-red-300">{friendlyError(error)}</p>}
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
