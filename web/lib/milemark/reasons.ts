/** Copy for disabled claim / reclaim / dispute — domain, not React. */

export function claimReason(input: {
  connected: boolean;
  isBeneficiary: boolean;
  claimable: bigint;
  challengingCount?: number;
  disputedCount?: number;
}): string | null {
  if (!input.connected) return "Connect the beneficiary wallet to claim.";
  if (!input.isBeneficiary) return "Only the beneficiary can claim.";
  if (input.claimable === 0n) {
    const challenging = input.challengingCount ?? 0;
    const disputed = input.disputedCount ?? 0;
    if (challenging > 0) {
      return challenging === 1
        ? "Claim is blocked while the challenge window is open. Wait it out, or a sponsor/attestor may dispute."
        : `Claim is blocked — ${challenging} milestones are still in the challenge window.`;
    }
    if (disputed > 0) {
      return disputed === 1
        ? "The completed milestone was disputed — it is not claimable. The sponsor may reclaim after the deadline."
        : `${disputed} disputed milestones are not claimable. The sponsor may reclaim them after the deadline.`;
    }
    return "Nothing to claim yet — wait for quorum, then the challenge window (undisputed).";
  }
  return null;
}

export function reclaimReason(input: {
  connected: boolean;
  isSponsor: boolean;
  reclaimable: bigint;
  deadline: bigint;
  nowMs?: number;
}): string | null {
  if (!input.connected) return "Connect the sponsor wallet to reclaim.";
  if (!input.isSponsor) return "Only the sponsor can reclaim.";
  if (input.reclaimable === 0n) {
    const now = input.nowMs ?? Date.now();
    return Number(input.deadline) * 1000 > now
      ? "Deadline has not passed yet (or nothing is reclaimable)."
      : "Nothing left to reclaim on incomplete or disputed milestones.";
  }
  return null;
}

export function disputeReason(input: {
  connected: boolean;
  isSponsor: boolean;
  isAttestor: boolean;
  completed: boolean;
  disputed: boolean;
  claimed?: boolean;
  reclaimed?: boolean;
  windowOpen: boolean;
}): string | null {
  if (input.claimed) return "Already claimed — nothing to dispute.";
  if (input.reclaimed) return "Already reclaimed.";
  if (!input.connected) {
    return "Connect the sponsor or a listed attestor wallet to dispute.";
  }
  if (!input.isSponsor && !input.isAttestor) {
    return "Only the sponsor or a listed attestor can dispute.";
  }
  if (!input.completed) return "Milestone has not reached quorum yet.";
  if (input.disputed) return "Already disputed — claim is permanently blocked.";
  if (!input.windowOpen) return "Challenge window has closed — too late to dispute.";
  return null;
}

export const DISPUTE_WHO =
  "Sponsor or any listed attestor may dispute during the challenge window. Dispute is sticky and blocks claim.";
