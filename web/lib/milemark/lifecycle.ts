import type { Milestone } from "./types";

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

export function formatWindow(seconds: number): string {
  if (seconds <= 0) return "none (instant claim)";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
