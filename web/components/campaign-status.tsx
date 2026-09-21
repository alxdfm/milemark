"use client";

import Link from "next/link";
import { useCampaign } from "@/hooks/use-campaign";
import { useNowSec } from "@/hooks/use-now-sec";
import { ESCROW_FROM_BLOCK } from "@/lib/chains";
import { CampaignLookup } from "@/components/campaign-lookup";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampaignHeaderCard } from "./campaign/header-card";
import { MilestoneList } from "./campaign/milestone-list";
import { ClaimCard } from "./campaign/claim-card";
import { ReclaimCard } from "./campaign/reclaim-card";
import { CampaignTimeline } from "./campaign/timeline";

export function CampaignStatus({ campaignId }: { campaignId: string }) {
  const campaign = useCampaign(campaignId);
  const nowSec = useNowSec(1000);

  if (campaign.status === "unconfigured") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escrow not configured</CardTitle>
          <CardDescription>
            Set NEXT_PUBLIC_ESCROW_ADDRESS after deploying MilestoneEscrow v3. Do
            not point the UI at frozen v2 or obsolete v1.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (campaign.status === "invalid") {
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

  if (campaign.status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Could not load campaign {campaign.id?.toString() ?? campaign.rawId}
          </CardTitle>
          <CardDescription>
            {campaign.errorMessage ?? "RPC read failed."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            className="text-sm text-accent hover:underline"
            onClick={() => campaign.refetch()}
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (campaign.status === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Loading campaign {campaign.id?.toString() ?? campaign.rawId}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (campaign.status === "not-found" || !campaign.view || campaign.id === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign not found</CardTitle>
          <CardDescription>
            Nothing at id {campaign.id?.toString() ?? campaign.rawId} on this
            escrow.
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

  const { view, id, milestones, attestors, attestedFlags, roles, totals, refetch } =
    campaign;

  return (
    <div className="flex flex-col gap-6">
      <CampaignHeaderCard
        id={id}
        view={view}
        attestors={attestors}
        totals={totals}
        isSponsor={roles.isSponsor}
        isAttestor={roles.isAttestor}
        isBeneficiary={roles.isBeneficiary}
      />
      <MilestoneList
        campaignId={id}
        milestones={milestones}
        quorum={view.quorum}
        challengeWindow={view.challengeWindow}
        nowSec={nowSec}
        isAttestor={roles.isAttestor}
        isSponsor={roles.isSponsor}
        connected={roles.connected}
        attestedFlags={attestedFlags}
        onSettled={refetch}
      />
      <ClaimCard
        campaignId={id}
        claimable={view.claimable}
        connected={roles.connected}
        isBeneficiary={roles.isBeneficiary}
        milestones={milestones}
        challengeWindow={view.challengeWindow}
        nowSec={nowSec}
        onSettled={refetch}
      />
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            Onchain events for this campaign (no indexer). fromBlock{" "}
            <code className="font-mono text-xs">{ESCROW_FROM_BLOCK.toString()}</code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignTimeline
            campaignId={id}
            refreshKey={campaign.refreshKey}
            campaignExists
          />
        </CardContent>
      </Card>
      <ReclaimCard
        campaignId={id}
        reclaimable={view.reclaimable}
        deadline={view.deadline}
        connected={roles.connected}
        isSponsor={roles.isSponsor}
        milestones={milestones}
        nowSec={nowSec}
        onSettled={refetch}
      />
    </div>
  );
}
