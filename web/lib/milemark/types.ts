import type { Address } from "./address";

export type Milestone = {
  description: string;
  evidenceURI: string;
  amount: bigint;
  completed: boolean;
  claimed: boolean;
  reclaimed: boolean;
};

export type CampaignView = {
  sponsor: Address;
  beneficiary: Address;
  title: string;
  briefURI: string;
  deadline: bigint;
  milestoneCount: bigint;
  createdAt: bigint;
  claimable: bigint;
  reclaimable: bigint;
};

export type MilestoneStatus = "open" | "completed" | "claimed" | "reclaimed";

export type CampaignTotals = {
  total: bigint;
  released: bigint;
  paid: bigint;
  completeCount: number;
  progressPct: number;
};

export function milestoneStatus(m: Milestone): MilestoneStatus {
  if (m.reclaimed) return "reclaimed";
  if (m.claimed) return "claimed";
  if (m.completed) return "completed";
  return "open";
}

export function campaignTotals(list: readonly Milestone[]): CampaignTotals {
  const total = list.reduce((sum, m) => sum + m.amount, 0n);
  const released = list
    .filter((m) => m.completed)
    .reduce((sum, m) => sum + m.amount, 0n);
  const paid = list.filter((m) => m.claimed).reduce((sum, m) => sum + m.amount, 0n);
  const completeCount = list.filter((m) => m.completed).length;
  const progressPct = list.length
    ? Math.round((100 * completeCount) / list.length)
    : 0;
  return { total, released, paid, completeCount, progressPct };
}
