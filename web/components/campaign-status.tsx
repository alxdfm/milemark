"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/abi";
import {
  ESCROW_ADDRESS,
  explorerAddress,
  isEscrowConfigured,
} from "@/lib/chains";
import { formatUsdc, shortAddress, toBigInt } from "@/lib/format";
import { linkLabel, publicHref } from "@/lib/links";
import { ClaimButton } from "@/components/claim-button";
import { ReclaimButton } from "@/components/reclaim-button";
import { CompleteButton } from "@/components/complete-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampaignLookup } from "@/components/campaign-lookup";

type Milestone = {
  description: string;
  evidenceURI: string;
  amount: bigint;
  completed: boolean;
  claimed: boolean;
  reclaimed: boolean;
};

type CampaignView = {
  sponsor: `0x${string}`;
  beneficiary: `0x${string}`;
  title: string;
  briefURI: string;
  deadline: bigint;
  milestoneCount: bigint;
  createdAt: bigint;
  claimable: bigint;
  reclaimable: bigint;
};

function parseId(raw: string): bigint | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

function asRecord(raw: unknown): (Record<string, unknown> & unknown[]) | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown> & unknown[];
}

function parseCampaignView(raw: unknown): CampaignView | null {
  let data = raw;
  if (data && typeof data === "object" && "view_" in data) {
    data = (data as { view_: unknown }).view_;
  }
  const r = asRecord(data);
  if (!r) return null;
  const sponsor = (r.sponsor ?? r[0]) as `0x${string}` | undefined;
  const beneficiary = (r.beneficiary ?? r[1]) as `0x${string}` | undefined;
  if (!sponsor || !beneficiary) return null;
  return {
    sponsor,
    beneficiary,
    title: String(r.title ?? r[2] ?? "Campaign"),
    briefURI: String(r.briefURI ?? r[3] ?? ""),
    deadline: toBigInt(r.deadline ?? r[4]) ?? 0n,
    milestoneCount: toBigInt(r.milestoneCount ?? r[5]) ?? 0n,
    createdAt: toBigInt(r.createdAt ?? r[6]) ?? 0n,
    claimable: toBigInt(r.claimable ?? r[7]) ?? 0n,
    reclaimable: toBigInt(r.reclaimable ?? r[8]) ?? 0n,
  };
}

function asMilestone(raw: unknown): Milestone | null {
  const r = asRecord(raw);
  if (!r) return null;
  const description = (r.description ?? r[0]) as string | undefined;
  const evidenceURI = String(r.evidenceURI ?? r[1] ?? "");
  const amount = toBigInt(r.amount ?? r[2]);
  const completed = Boolean(r.completed ?? r[3]);
  const claimed = Boolean(r.claimed ?? r[4]);
  const reclaimed = Boolean(r.reclaimed ?? r[5]);
  if (description === undefined || amount === undefined) return null;
  return { description, evidenceURI, amount, completed, claimed, reclaimed };
}

function RoleChip({ label, mine }: { label: string; mine: boolean }) {
  return (
    <span
      className={
        mine
          ? "rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent"
          : "rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted"
      }
    >
      {label}
      {mine ? " · you" : ""}
    </span>
  );
}

function DeadlineLine({
  deadline,
  reclaimable,
}: {
  deadline: bigint;
  reclaimable: bigint;
}) {
  const ms = Number(deadline) * 1000;
  const expired = Date.now() > ms;
  const date = new Date(ms);
  const diff = Math.abs(ms - Date.now());
  const mins = Math.round(diff / 60000);
  const rel =
    mins < 60
      ? `${mins}m`
      : mins < 60 * 48
        ? `${Math.round(mins / 60)}h`
        : `${Math.round(mins / 60 / 24)}d`;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
      <span>
        Deadline {date.toLocaleString()}{" "}
        <span className="text-[10px] uppercase tracking-wider">
          ({Intl.DateTimeFormat().resolvedOptions().timeZone})
        </span>
      </span>
      <span
        className={
          expired
            ? "rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-200"
            : "rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent"
        }
      >
        {expired ? `Expired ${rel} ago` : `${rel} left`}
      </span>
      <span>· reclaimable {formatUsdc(reclaimable)} USDC</span>
    </p>
  );
}

export function CampaignStatus({ campaignId }: { campaignId: string }) {
  const id = parseId(campaignId);
  const { address } = useAccount();

  const campaign = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "getCampaign",
    args: id !== null ? [id] : undefined,
    query: { enabled: id !== null && isEscrowConfigured },
  });

  const milestones = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "getMilestones",
    args: id !== null ? [id] : undefined,
    query: { enabled: id !== null && isEscrowConfigured },
  });

  const attestors = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "getAttestors",
    args: id !== null ? [id] : undefined,
    query: { enabled: id !== null && isEscrowConfigured },
  });

  const refetchCampaign = campaign.refetch;
  const refetchMilestones = milestones.refetch;
  const refetchAttestors = attestors.refetch;
  const refetch = useCallback(() => {
    void refetchCampaign();
    void refetchMilestones();
    void refetchAttestors();
  }, [refetchCampaign, refetchMilestones, refetchAttestors]);

  const view = useMemo(() => parseCampaignView(campaign.data), [campaign.data]);

  const list = useMemo(() => {
    const raw = (milestones.data ?? []) as unknown[];
    return raw.map(asMilestone).filter((m): m is Milestone => m !== null);
  }, [milestones.data]);

  const attestorList = (attestors.data ?? []) as readonly `0x${string}`[];

  if (!isEscrowConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escrow not configured</CardTitle>
          <CardDescription>
            Set NEXT_PUBLIC_ESCROW_ADDRESS after deploying MilestoneEscrow.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (id === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid campaign id</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignLookup />
        </CardContent>
      </Card>
    );
  }

  if (campaign.isLoading || milestones.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading campaign {id.toString()}</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (campaign.isError || !view) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign not found</CardTitle>
          <CardDescription>
            Nothing at id {id.toString()} on this escrow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/create" className="text-sm text-accent hover:underline">
            Create a campaign →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const total = list.reduce((s, m) => s + m.amount, 0n);
  const released = list.filter((m) => m.completed).reduce((s, m) => s + m.amount, 0n);
  const paid = list.filter((m) => m.claimed).reduce((s, m) => s + m.amount, 0n);
  const isAttestor =
    !!address &&
    attestorList.some((a) => a.toLowerCase() === address.toLowerCase());
  const isBeneficiary =
    !!address && address.toLowerCase() === view.beneficiary.toLowerCase();
  const isSponsor =
    !!address && address.toLowerCase() === view.sponsor.toLowerCase();
  const sponsorExplorer = explorerAddress(view.sponsor);
  const briefHref = publicHref(view.briefURI);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Campaign {id.toString()}
          </p>
          <CardTitle className="mt-1">{view.title}</CardTitle>
          <CardDescription className="mt-2">
            {list.length} milestones · {formatUsdc(total)} USDC locked
            {view.briefURI ? (
              <>
                {" · "}
                {briefHref ? (
                  <a
                    className="text-accent hover:underline"
                    href={briefHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {linkLabel(view.briefURI)}
                  </a>
                ) : (
                  <span className="text-muted" title={view.briefURI}>
                    brief (unsupported URI)
                  </span>
                )}
              </>
            ) : null}
          </CardDescription>
          <DeadlineLine deadline={view.deadline} reclaimable={view.reclaimable} />
          <div className="mt-3 flex flex-wrap gap-2">
            <RoleChip label="Sponsor" mine={isSponsor} />
            <RoleChip label="Attestor" mine={isAttestor} />
            <RoleChip label="Beneficiary" mine={isBeneficiary} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted">Sponsor</span>
            {sponsorExplorer ? (
              <a
                className="font-mono hover:text-accent"
                href={sponsorExplorer}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(view.sponsor)}
              </a>
            ) : (
              <span className="font-mono">{shortAddress(view.sponsor)}</span>
            )}
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted">Beneficiary</span>
            <span className="font-mono">{shortAddress(view.beneficiary)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted">Attestors ({attestorList.length})</span>
            {attestorList.map((a) => (
              <span key={a} className="font-mono text-xs">
                {shortAddress(a)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-ink p-3 text-center">
            <div>
              <p className="text-[10px] uppercase text-muted">Released</p>
              <p className="mt-1 font-mono text-sm">{formatUsdc(released)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted">Claimable</p>
              <p className="mt-1 font-mono text-sm text-accent">
                {formatUsdc(view.claimable)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted">Paid</p>
              <p className="mt-1 font-mono text-sm">{formatUsdc(paid)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>Any-order completion · evidence optional</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {list.map((m, i) => {
            const evidenceHref = publicHref(m.evidenceURI);
            return (
              <div
                key={i}
                className="flex flex-col gap-2 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-xs text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="font-medium">{m.description}</p>
                  <p className="text-xs text-muted">
                    {formatUsdc(m.amount)} USDC ·{" "}
                    {m.reclaimed
                      ? "reclaimed"
                      : m.claimed
                        ? "claimed"
                        : m.completed
                          ? "completed"
                          : "open"}
                  </p>
                  {m.evidenceURI ? (
                    evidenceHref ? (
                      <a
                        className="text-xs text-accent hover:underline"
                        href={evidenceHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {linkLabel(m.evidenceURI)}
                      </a>
                    ) : (
                      <span className="text-xs text-muted" title={m.evidenceURI}>
                        evidence URI (not browser-openable)
                      </span>
                    )
                  ) : null}
                </div>
                <CompleteButton
                  campaignId={id}
                  index={i}
                  disabled={!isAttestor || m.completed || m.reclaimed}
                  onSettled={refetch}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claim</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!address && (
            <p className="text-xs text-muted">Connect the beneficiary wallet to claim.</p>
          )}
          {address && !isBeneficiary && (
            <p className="text-xs text-muted">Only the beneficiary can claim.</p>
          )}
          <ClaimButton
            campaignId={id}
            amount={view.claimable}
            disabled={!isBeneficiary}
            onSettled={refetch}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reclaim</CardTitle>
          <CardDescription>
            After the deadline, the sponsor reclaims USDC still locked in incomplete milestones.
            Completed-but-unclaimed amounts stay for the beneficiary.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!address && (
            <p className="text-xs text-muted">Connect the sponsor wallet to reclaim.</p>
          )}
          {address && !isSponsor && (
            <p className="text-xs text-muted">Only the sponsor can reclaim.</p>
          )}
          {address && isSponsor && view.reclaimable === 0n && (
            <p className="text-xs text-muted">
              {Number(view.deadline) * 1000 > Date.now()
                ? "Deadline has not passed yet (or nothing is reclaimable)."
                : "Nothing left to reclaim on incomplete milestones."}
            </p>
          )}
          <ReclaimButton
            campaignId={id}
            amount={view.reclaimable}
            disabled={!isSponsor || view.reclaimable === 0n}
            onSettled={refetch}
          />
        </CardContent>
      </Card>
    </div>
  );
}
