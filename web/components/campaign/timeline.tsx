"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/contracts";
import {
  ESCROW_ADDRESS,
  ESCROW_FROM_BLOCK,
  explorerTx,
  isEscrowConfigured,
  milemarkChain,
} from "@/lib/chains";
import { formatUsdc, shortAddress } from "@/lib/milemark";

type Item = {
  key: string;
  blockNumber: bigint;
  logIndex: number;
  txHash: `0x${string}`;
  title: string;
  detail: string;
};

export function CampaignTimeline({
  campaignId,
  refreshKey,
  campaignExists = false,
}: {
  campaignId: bigint;
  refreshKey: number;
  campaignExists?: boolean;
}) {
  const client = usePublicClient({ chainId: milemarkChain.id });
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !isEscrowConfigured) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const common = {
          address: ESCROW_ADDRESS,
          abi: milestoneEscrowAbi,
          fromBlock: ESCROW_FROM_BLOCK,
          args: { campaignId },
        } as const;

        const [created, attested, completed, disputed, claimed, reclaimed] =
          await Promise.all([
            client!.getContractEvents({
              ...common,
              eventName: "CampaignCreated",
            }),
            client!.getContractEvents({
              ...common,
              eventName: "MilestoneAttested",
            }),
            client!.getContractEvents({
              ...common,
              eventName: "MilestoneCompleted",
            }),
            client!.getContractEvents({
              ...common,
              eventName: "MilestoneDisputed",
            }),
            client!.getContractEvents({
              ...common,
              eventName: "Claimed",
            }),
            client!.getContractEvents({
              ...common,
              eventName: "Reclaimed",
            }),
          ]);

        const next: Item[] = [];

        for (const log of created) {
          next.push({
            key: `${log.transactionHash}-${log.logIndex}`,
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
            txHash: log.transactionHash,
            title: "Campaign created",
            detail: `${formatUsdc(log.args.totalAmount ?? 0n)} USDC locked · quorum ${log.args.quorum ?? 0}`,
          });
        }
        for (const log of attested) {
          const ev = log.args.evidenceURI;
          next.push({
            key: `${log.transactionHash}-${log.logIndex}`,
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
            txHash: log.transactionHash,
            title: `Milestone ${(log.args.index ?? 0n) + 1n} attested`,
            // O evento carrega a URI que o atestador enviou; o contrato guarda
            // apenas a primeira não vazia. Rotulado para não confundir as duas.
            detail: `${shortAddress(String(log.args.attestor ?? ""))} · ${log.args.attestationCount ?? 0}/${log.args.quorum ?? 0}${ev ? ` · submitted ${ev}` : ""}`,
          });
        }
        for (const log of completed) {
          const ev = log.args.evidenceURI;
          next.push({
            key: `${log.transactionHash}-${log.logIndex}`,
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
            txHash: log.transactionHash,
            title: `Milestone ${(log.args.index ?? 0n) + 1n} completed (quorum)`,
            detail: `${shortAddress(String(log.args.attestor ?? ""))}${ev ? ` · stored ${ev}` : ""}`.trim(),
          });
        }
        for (const log of disputed) {
          next.push({
            key: `${log.transactionHash}-${log.logIndex}`,
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
            txHash: log.transactionHash,
            title: `Milestone ${(log.args.index ?? 0n) + 1n} disputed`,
            detail: shortAddress(String(log.args.disputer ?? "")),
          });
        }
        for (const log of claimed) {
          next.push({
            key: `${log.transactionHash}-${log.logIndex}`,
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
            txHash: log.transactionHash,
            title: "Claimed",
            detail: `${formatUsdc(log.args.amount ?? 0n)} USDC to beneficiary`,
          });
        }
        for (const log of reclaimed) {
          next.push({
            key: `${log.transactionHash}-${log.logIndex}`,
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
            txHash: log.transactionHash,
            title: "Reclaimed",
            detail: `${formatUsdc(log.args.amount ?? 0n)} USDC back to sponsor`,
          });
        }

        next.sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return a.logIndex - b.logIndex;
          return a.blockNumber < b.blockNumber ? -1 : 1;
        });

        if (!cancelled) setItems(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load events.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [client, campaignId, refreshKey]);

  return (
    <div className="flex flex-col gap-3">
      {loading && <p className="text-sm text-muted">Reading onchain events…</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted">
          {campaignExists
            ? `No events in the configured fromBlock window (${ESCROW_FROM_BLOCK.toString()}). If this campaign exists, set NEXT_PUBLIC_ESCROW_FROM_BLOCK to a block before CampaignCreated (canonical live v3: 309949200) and rebuild. getCampaign still works.`
            : "No events indexed from this escrow yet."}
        </p>
      )}
      {items.map((item) => {
        const href = explorerTx(item.txHash);
        return (
          <div
            key={item.key}
            className="flex items-start justify-between gap-3 border-b border-dashed border-line pb-3 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 break-all font-mono text-xs text-muted">
                {item.detail}
              </p>
            </div>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-accent hover:underline"
              >
                Arbiscan
              </a>
            ) : (
              <span className="shrink-0 font-mono text-[10px] text-muted">
                #{item.blockNumber.toString()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
