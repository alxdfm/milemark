"use client";

import { explorerTx } from "@/lib/chains";
import { friendlyError } from "@/lib/milemark";

export function TxFeedback({
  hash,
  error,
  isPending,
  isConfirming,
  isSuccess,
  successLabel = "Confirmed onchain.",
}: {
  hash?: `0x${string}`;
  error?: unknown;
  isPending?: boolean;
  isConfirming?: boolean;
  isSuccess?: boolean;
  successLabel?: string;
}) {
  const href = hash ? explorerTx(hash) : undefined;
  if (!hash && !error && !isPending && !isConfirming && !isSuccess) return null;

  return (
    <div className="flex flex-col gap-1 text-xs">
      {isPending && <p className="text-muted">Confirm in wallet…</p>}
      {isConfirming && href && (
        <p className="text-muted">
          Waiting for confirmation.{" "}
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            View on Arbiscan
          </a>
        </p>
      )}
      {isSuccess && (
        <p className="text-accent">
          {successLabel}
          {href ? (
            <>
              {" "}
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View on Arbiscan
              </a>
            </>
          ) : null}
        </p>
      )}
      {error ? (
        <p className="text-red-300">{friendlyError(error)}</p>
      ) : null}
    </div>
  );
}
