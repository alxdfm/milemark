"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/abi";
import {
  ESCROW_ADDRESS,
  explorerAddress,
  isEscrowConfigured,
} from "@/lib/chains";
import {
  externalHref,
  formatCountdown,
  formatUnix,
  formatUsdc,
  shortAddress,
} from "@/lib/format";
import { CampaignLookup } from "@/components/campaign-lookup";
import { CampaignTimeline } from "@/components/campaign-timeline";
import { ClaimButton } from "@/components/claim-button";
import { CompleteButton } from "@/components/complete-button";
import { ReclaimButton } from "@/components/reclaim-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Milestone = {
  description: string;
  evidenceURI: string;
  amount: bigint;
  completed: boolean;
  claimed: boolean;
  reclaimed: boolean;
};

function parseId(raw: string): bigint | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
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

function AddressLink({ address }: { address: `0x${string}` }) {
  const href = explorerAddress(address);
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-sm text-foreground hover:text-accent"
      >
        {shortAddress(address)}
      </a>
    );
  }
  return <span className="font-mono text-sm">{shortAddress(address)}</span>;
}

export function CampaignStatus({ campaignId }: { campaignId: string }) {
  const id = parseId(campaignId);
  const { address } = useAccount();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [copied, setCopied] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 15_000);
    return () => clearInterval(timer);
  }, []);

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
    setTimelineKey((k) => k + 1);
  }, [refetchCampaign, refetchMilestones, refetchAttestors]);

  if (!isEscrowConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escrow not configured</CardTitle>
          <CardDescription>
            Deploy MilestoneEscrow v2 and set NEXT_PUBLIC_ESCROW_ADDRESS. The
            v1 address is obsolete after the ABI break.
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
          <CardDescription>
            Campaign ids are unsigned integers assigned in creation order,
            starting at 0.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignLookup />
        </CardContent>
      </Card>
    );
  }

  if (campaign.isLoading || milestones.isLoading || attestors.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading campaign {id.toString()}</CardTitle>
          <CardDescription>Reading from the escrow contract…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
            <div className="h-16 animate-pulse rounded bg-line" />
            <div className="h-16 animate-pulse rounded bg-line" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaign.isError || milestones.isError || !campaign.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign not found</CardTitle>
          <CardDescription>
            Nothing is stored at id {id.toString()} on this escrow. Check the
            network and contract address, or create a campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CampaignLookup />
          <Link href="/create" className="text-sm text-accent hover:underline">
            Create a campaign →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const view = campaign.data;
  const sponsor = view.sponsor;
  const beneficiary = view.beneficiary;
  const claimable = view.claimable;
  const reclaimable = view.reclaimable;
  const list = (milestones.data ?? []) as readonly Milestone[];
  const attestorList = (attestors.data ?? []) as readonly `0x${string}`[];
  const total = list.reduce((s, m) => s + m.amount, 0n);
  const released = list
    .filter((m) => m.completed)
    .reduce((s, m) => s + m.amount, 0n);
  const paid = list.filter((m) => m.claimed).reduce((s, m) => s + m.amount, 0n);

  const isSponsor =
    !!address && address.toLowerCase() === sponsor.toLowerCase();
  const isBeneficiary =
    !!address && address.toLowerCase() === beneficiary.toLowerCase();
  const isAttestor =
    !!address &&
    attestorList.some((a) => a.toLowerCase() === address.toLowerCase());
  const roleLabel = !address
    ? "Viewer"
    : isSponsor
      ? "Sponsor"
      : isAttestor
        ? "Attestor"
        : isBeneficiary
          ? "Beneficiary"
          : "Other";

  const briefHref = externalHref(view.briefURI);
  const escrowHref = explorerAddress(ESCROW_ADDRESS);
  const pastDeadline = nowSec > Number(view.deadline);
  const displayTitle = view.title.trim() || `Campaign ${id.toString()}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Campaign {id.toString()}
              </p>
              <CardTitle className="mt-1 break-words">{displayTitle}</CardTitle>
              <CardDescription className="mt-2">
                {list.length} milestone{list.length === 1 ? "" : "s"} ·{" "}
                {formatUsdc(total)} USDC locked
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RoleChip label={roleLabel} mine={Boolean(address)} />
              <button
                type="button"
                onClick={() => void copyLink()}
                className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {isSponsor && <RoleChip label="Sponsor" mine />}
            {isAttestor && <RoleChip label="Attestor" mine />}
            {isBeneficiary && <RoleChip label="Beneficiary" mine />}
            {address && !isSponsor && !isAttestor && !isBeneficiary && (
              <RoleChip label="Other" mine={false} />
            )}
          </div>

          {view.briefURI && (
            <p className="text-sm">
              <span className="mr-2 text-xs uppercase tracking-[0.14em] text-muted">
                Brief
              </span>
              {briefHref ? (
                <a
                  href={briefHref}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-accent hover:underline"
                >
                  {view.briefURI}
                </a>
              ) : (
                <span className="break-all font-mono text-xs">{view.briefURI}</span>
              )}
            </p>
          )}

          <div className="rounded-lg border border-line bg-ink px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Deadline
            </p>
            <p className="mt-1 text-sm">
              {formatCountdown(view.deadline, nowSec)}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted">
              {formatUnix(view.deadline)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.14em] text-muted">
                Sponsor
              </span>
              <AddressLink address={sponsor} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.14em] text-muted">
                Beneficiary
              </span>
              <AddressLink address={beneficiary} />
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <span className="text-xs uppercase tracking-[0.14em] text-muted">
                Attestors
              </span>
              <div className="flex flex-col items-end gap-1">
                {attestorList.map((a) => (
                  <AddressLink key={a} address={a} />
                ))}
              </div>
            </div>
            {escrowHref && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.14em] text-muted">
                  Escrow
                </span>
                <a
                  href={escrowHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  Arbiscan
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-ink p-3 text-center">
            <Stat label="Released" value={formatUsdc(released)} />
            <Stat label="Claimable" value={formatUsdc(claimable)} accent />
            <Stat label="Paid out" value={formatUsdc(paid)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>
            Completion is any-order. Attestors may attach an evidence URI when
            they mark a mile complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {list.length === 0 && (
            <p className="text-sm text-muted">No milestones on this campaign.</p>
          )}
          {list.map((m, i) => (
            <MilestoneRow
              key={i}
              index={i}
              last={i === list.length - 1}
              milestone={m}
              campaignId={id}
              canComplete={isAttestor && !m.completed && !m.reclaimed}
              onSettled={refetch}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claim</CardTitle>
          <CardDescription>
            {isBeneficiary
              ? "Withdraw the sum of completed milestones you have not claimed yet."
              : "Connect the beneficiary wallet to withdraw released USDC."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClaimButton
            campaignId={id}
            amount={claimable}
            disabled={!isBeneficiary}
            onSettled={refetch}
          />
        </CardContent>
      </Card>

      {isSponsor && pastDeadline && reclaimable > 0n && (
        <Card>
          <CardHeader>
            <CardTitle>Reclaim</CardTitle>
            <CardDescription>
              Deadline has passed. Pull USDC still locked on incomplete miles.
              Completed-but-unclaimed amounts stay with the beneficiary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReclaimButton
              campaignId={id}
              amount={reclaimable}
              onSettled={refetch}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            Onchain events from this escrow (no indexer).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignTimeline campaignId={id} refreshKey={timelineKey} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-1 font-mono text-sm ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function MilestoneRow({
  index,
  last,
  milestone,
  campaignId,
  canComplete,
  onSettled,
}: {
  index: number;
  last: boolean;
  milestone: Milestone;
  campaignId: bigint;
  canComplete: boolean;
  onSettled: () => void;
}) {
  const status = milestone.reclaimed
    ? "Reclaimed"
    : milestone.claimed
      ? "Claimed"
      : milestone.completed
        ? "Released"
        : "Locked";
  const evidenceHref = externalHref(milestone.evidenceURI);

  return (
    <div
      className={`grid gap-3 py-4 sm:grid-cols-[2rem_1fr_auto] ${
        last ? "" : "border-b border-dashed border-line"
      }`}
    >
      <div className="flex flex-col items-center">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] ${
            milestone.completed
              ? "bg-accent text-ink"
              : "border border-line text-muted"
          }`}
        >
          {index + 1}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">{milestone.description}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          {formatUsdc(milestone.amount)} USDC · {status}
        </p>
        {milestone.evidenceURI && (
          <p className="mt-1 text-xs">
            {evidenceHref ? (
              <a
                href={evidenceHref}
                target="_blank"
                rel="noreferrer"
                className="break-all text-accent hover:underline"
              >
                Evidence
              </a>
            ) : (
              <span className="break-all font-mono text-muted">
                {milestone.evidenceURI}
              </span>
            )}
          </p>
        )}
      </div>
      {canComplete ? (
        <CompleteButton
          campaignId={campaignId}
          index={index}
          onSettled={onSettled}
        />
      ) : (
        <span className="pt-1 text-xs text-muted">{status}</span>
      )}
    </div>
  );
}
