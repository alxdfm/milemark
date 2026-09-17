"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/abi";
import {
  ESCROW_ADDRESS,
  explorerAddress,
  isEscrowConfigured,
} from "@/lib/chains";
import { formatUsdc, shortAddress } from "@/lib/format";
import { ClaimButton } from "@/components/claim-button";
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
  amount: bigint;
  completed: boolean;
  claimed: boolean;
};

function parseId(raw: string): bigint | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

function RoleChip({
  label,
  mine,
}: {
  label: string;
  mine: boolean;
}) {
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

function AddressRow({
  label,
  address,
  mine,
  role,
}: {
  label: string;
  address: `0x${string}`;
  mine: boolean;
  role: string;
}) {
  const href = explorerAddress(address);
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        <RoleChip label={role} mine={mine} />
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-sm text-foreground hover:text-accent"
        >
          {shortAddress(address)}
        </a>
      ) : (
        <span className="font-mono text-sm">{shortAddress(address)}</span>
      )}
    </div>
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

  const refetchCampaign = campaign.refetch;
  const refetchMilestones = milestones.refetch;
  const refetch = useCallback(() => {
    void refetchCampaign();
    void refetchMilestones();
  }, [refetchCampaign, refetchMilestones]);

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

  if (campaign.isLoading || milestones.isLoading) {
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

  const sponsor = campaign.data[0];
  const beneficiary = campaign.data[1];
  const attestor = campaign.data[2];
  const claimable = campaign.data[5];
  const list = (milestones.data ?? []) as readonly Milestone[];
  const total = list.reduce((s, m) => s + m.amount, 0n);
  const released = list
    .filter((m) => m.completed)
    .reduce((s, m) => s + m.amount, 0n);
  const paid = list.filter((m) => m.claimed).reduce((s, m) => s + m.amount, 0n);

  const isAttestor =
    !!address && address.toLowerCase() === attestor.toLowerCase();
  const isBeneficiary =
    !!address && address.toLowerCase() === beneficiary.toLowerCase();
  const isSponsor =
    !!address && address.toLowerCase() === sponsor.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Campaign {id.toString()}
              </p>
              <CardTitle className="mt-1">Milestone escrow</CardTitle>
              <CardDescription className="mt-2">
                {list.length} milestone{list.length === 1 ? "" : "s"} ·{" "}
                {formatUsdc(total)} USDC locked
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AddressRow
            label="Sponsor"
            address={sponsor}
            mine={isSponsor}
            role="funds"
          />
          <AddressRow
            label="Attestor"
            address={attestor}
            mine={isAttestor}
            role="attests"
          />
          <AddressRow
            label="Beneficiary"
            address={beneficiary}
            mine={isBeneficiary}
            role="claims"
          />
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
            Completion is any-order: the attestor may mark a later milestone
            before an earlier one.
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
              canComplete={isAttestor && !m.completed}
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
  const status = milestone.claimed
    ? "Claimed"
    : milestone.completed
      ? "Released"
      : "Locked";

  return (
    <div
      className={`grid grid-cols-[2rem_1fr_auto] items-start gap-3 py-4 ${
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
