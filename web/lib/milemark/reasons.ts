/** Copy for disabled claim / reclaim — domain, not React. */

export function claimReason(input: {
  connected: boolean;
  isBeneficiary: boolean;
  claimable: bigint;
}): string | null {
  if (!input.connected) return "Connect the beneficiary wallet to claim.";
  if (!input.isBeneficiary) return "Only the beneficiary can claim.";
  if (input.claimable === 0n) {
    return "Nothing to claim yet — wait for an attestor to mark a mile complete.";
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
      : "Nothing left to reclaim on incomplete milestones.";
  }
  return null;
}
