import type { Address } from "./address";

export type Milestone = {
  description: string;
  evidenceURI: string;
  amount: bigint;
  completedAt: bigint;
  attestationCount: number;
  completed: boolean;
  claimed: boolean;
  reclaimed: boolean;
  disputed: boolean;
};

export type CampaignView = {
  sponsor: Address;
  beneficiary: Address;
  title: string;
  briefURI: string;
  deadline: bigint;
  challengeWindow: bigint;
  quorum: number;
  milestoneCount: bigint;
  createdAt: bigint;
  claimable: bigint;
  reclaimable: bigint;
};

export type MilestoneStatus =
  | "open"
  | "attesting"
  | "completed"
  | "challenging"
  | "disputed"
  | "claimed"
  | "reclaimed";

export type CampaignTotals = {
  total: bigint;
  released: bigint;
  paid: bigint;
  completeCount: number;
  progressPct: number;
};

export function milestoneStatus(
  m: Milestone,
  challengeWindow: bigint = 0n,
  nowSec: number = Math.floor(Date.now() / 1000),
): MilestoneStatus {
  if (m.reclaimed) return "reclaimed";
  if (m.claimed) return "claimed";
  if (m.disputed) return "disputed";
  if (m.completed) {
    const ends = m.completedAt + challengeWindow;
    if (BigInt(nowSec) < ends) return "challenging";
    return "completed";
  }
  if (m.attestationCount > 0) return "attesting";
  return "open";
}

export function campaignTotals(list: readonly Milestone[]): CampaignTotals {
  const total = list.reduce((sum, m) => sum + m.amount, 0n);
  const released = list
    .filter((m) => m.completed && !m.disputed)
    .reduce((sum, m) => sum + m.amount, 0n);
  const paid = list.filter((m) => m.claimed).reduce((sum, m) => sum + m.amount, 0n);
  const completeCount = list.filter((m) => m.completed && !m.disputed).length;
  const progressPct = list.length
    ? Math.round((100 * completeCount) / list.length)
    : 0;
  return { total, released, paid, completeCount, progressPct };
}
