import type { Milestone } from "./types";

export type IndexedMilestone = {
  index: number;
  milestone: Milestone;
};

/** Unix second when the challenge window closes (`completedAt + challengeWindow`). */
export function challengeEndsAt(
  completedAt: bigint,
  challengeWindow: bigint,
): bigint {
  return completedAt + challengeWindow;
}

export function isChallengeOpen(
  m: Pick<Milestone, "completed" | "disputed" | "claimed" | "reclaimed" | "completedAt">,
  challengeWindow: bigint,
  nowSec: number,
): boolean {
  if (!m.completed || m.disputed || m.claimed || m.reclaimed) return false;
  return BigInt(nowSec) < challengeEndsAt(m.completedAt, challengeWindow);
}

export function isMileClaimable(
  m: Milestone,
  challengeWindow: bigint,
  nowSec: number,
): boolean {
  if (!m.completed || m.claimed || m.disputed || m.reclaimed) return false;
  return BigInt(nowSec) >= challengeEndsAt(m.completedAt, challengeWindow);
}

export function canDispute(
  m: Milestone,
  challengeWindow: bigint,
  nowSec: number,
  isSponsor: boolean,
  isAttestor: boolean,
): boolean {
  if (!isSponsor && !isAttestor) return false;
  return isChallengeOpen(m, challengeWindow, nowSec);
}

/** Completed miles still inside the window — dispute is allowed, claim is not. */
export function showDisputeControls(
  m: Pick<Milestone, "completed" | "claimed" | "reclaimed">,
): boolean {
  return m.completed && !m.claimed && !m.reclaimed;
}

export function formatWindow(seconds: number): string {
  if (seconds <= 0) return "none (instant claim)";
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

/** Live countdown until `endsAt` (unix seconds). Includes seconds so the 1s tick is visible. */
export function formatChallengeRemaining(endsAt: bigint, nowSec: number): string {
  const delta = Number(endsAt) - nowSec;
  if (!Number.isFinite(delta) || delta <= 0) return "window closed";
  const h = Math.floor(delta / 3600);
  const m = Math.floor((delta % 3600) / 60);
  const s = delta % 60;
  if (h > 0) return `${h}h ${m}m ${s}s left to dispute`;
  if (m > 0) return `${m}m ${s}s left to dispute`;
  return `${s}s left to dispute`;
}

export function indexMilestones(
  list: readonly Milestone[],
): IndexedMilestone[] {
  return list.map((milestone, index) => ({ index, milestone }));
}

export function claimableMiles(
  list: readonly Milestone[],
  challengeWindow: bigint,
  nowSec: number,
): IndexedMilestone[] {
  return indexMilestones(list).filter(({ milestone }) =>
    isMileClaimable(milestone, challengeWindow, nowSec),
  );
}

export function challengingMiles(
  list: readonly Milestone[],
  challengeWindow: bigint,
  nowSec: number,
): IndexedMilestone[] {
  return indexMilestones(list).filter(({ milestone }) =>
    isChallengeOpen(milestone, challengeWindow, nowSec),
  );
}

/** Mirrors the contract's `_isReclaimable`: incomplete or disputed, not yet settled. */
export function isMileReclaimable(
  m: Pick<Milestone, "completed" | "claimed" | "reclaimed" | "disputed">,
): boolean {
  if (m.claimed || m.reclaimed) return false;
  return !m.completed || m.disputed;
}

/** Miles the sponsor would recover once the deadline passes. */
export function reclaimableMiles(list: readonly Milestone[]): IndexedMilestone[] {
  return indexMilestones(list).filter(({ milestone }) =>
    isMileReclaimable(milestone),
  );
}

export function disputedMiles(list: readonly Milestone[]): IndexedMilestone[] {
  return indexMilestones(list).filter(
    ({ milestone }) => milestone.disputed && !milestone.claimed && !milestone.reclaimed,
  );
}

export function claimableTotal(miles: readonly IndexedMilestone[]): bigint {
  return miles.reduce((sum, item) => sum + item.milestone.amount, 0n);
}
