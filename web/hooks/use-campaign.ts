"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { milestoneEscrowAbi } from "@/lib/contracts";
import {
  ESCROW_ADDRESS,
  isEscrowConfigured,
  milemarkChain,
} from "@/lib/chains";
import {
  campaignTotals,
  parseAttestors,
  parseCampaignId,
  parseCampaignView,
  parseFlags,
  parseMilestones,
  isCampaignNotFound,
  resolveRoles,
  type CampaignRoles,
  type CampaignTotals,
  type CampaignView,
  type Milestone,
} from "@/lib/milemark";

export type CampaignLoadStatus =
  | "unconfigured"
  | "invalid"
  | "loading"
  | "error"
  | "not-found"
  | "ready";

export type UseCampaignResult = {
  rawId: string;
  id: bigint | null;
  status: CampaignLoadStatus;
  errorMessage: string | null;
  view: CampaignView | null;
  milestones: Milestone[];
  attestors: readonly `0x${string}`[];
  attestedFlags: readonly boolean[];
  roles: CampaignRoles;
  totals: CampaignTotals;
  refreshKey: number;
  refetch: () => void;
};

export function useCampaign(campaignId: string): UseCampaignResult {
  const id = parseCampaignId(campaignId);
  const { address } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);

  const campaign = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "getCampaign",
    args: id !== null ? [id] : undefined,
    chainId: milemarkChain.id,
    query: { enabled: id !== null && isEscrowConfigured, retry: 1 },
  });

  const milestonesQuery = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "getMilestones",
    args: id !== null ? [id] : undefined,
    chainId: milemarkChain.id,
    query: { enabled: id !== null && isEscrowConfigured, retry: 1 },
  });

  const attestorsQuery = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "getAttestors",
    args: id !== null ? [id] : undefined,
    chainId: milemarkChain.id,
    query: { enabled: id !== null && isEscrowConfigured, retry: 1 },
  });

  const attestedQuery = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "hasAttestedAll",
    args: id !== null && address ? [id, address] : undefined,
    chainId: milemarkChain.id,
    query: {
      enabled: id !== null && isEscrowConfigured && Boolean(address),
      retry: 1,
    },
  });

  const refetchCampaign = campaign.refetch;
  const refetchMilestones = milestonesQuery.refetch;
  const refetchAttestors = attestorsQuery.refetch;
  const refetchAttested = attestedQuery.refetch;
  const refetch = useCallback(() => {
    void refetchCampaign();
    void refetchMilestones();
    void refetchAttestors();
    void refetchAttested();
    setRefreshKey((key) => key + 1);
  }, [refetchCampaign, refetchMilestones, refetchAttestors, refetchAttested]);

  const view = useMemo(
    () => parseCampaignView(campaign.data),
    [campaign.data],
  );
  const milestones = useMemo(
    () => parseMilestones(milestonesQuery.data),
    [milestonesQuery.data],
  );
  const attestors = useMemo(
    () => parseAttestors(attestorsQuery.data),
    [attestorsQuery.data],
  );
  const attestedFlags = useMemo(
    () => parseFlags(attestedQuery.data),
    [attestedQuery.data],
  );

  const roles = useMemo(
    () =>
      view
        ? resolveRoles(address, view, attestors)
        : {
            connected: Boolean(address),
            isSponsor: false,
            isBeneficiary: false,
            isAttestor: false,
          },
    [address, view, attestors],
  );

  const totals = useMemo(() => campaignTotals(milestones), [milestones]);

  // `getCampaign` reverte CampaignNotFound para um id inexistente, o que chega
  // aqui como isError — sem esta checagem o status nunca vira "not-found".
  const notFound =
    isCampaignNotFound(campaign.error) ||
    isCampaignNotFound(milestonesQuery.error);

  let status: CampaignLoadStatus;
  if (!isEscrowConfigured) status = "unconfigured";
  else if (id === null) status = "invalid";
  else if (notFound) status = "not-found";
  else if (campaign.isError || milestonesQuery.isError) status = "error";
  else if (campaign.isPending || milestonesQuery.isPending) status = "loading";
  else if (!view) status = "not-found";
  else status = "ready";

  const errorMessage =
    (campaign.error instanceof Error && campaign.error.message) ||
    (milestonesQuery.error instanceof Error && milestonesQuery.error.message) ||
    null;

  return {
    rawId: campaignId,
    id,
    status,
    errorMessage,
    view,
    milestones,
    attestors,
    attestedFlags,
    roles,
    totals,
    refreshKey,
    refetch,
  };
}
