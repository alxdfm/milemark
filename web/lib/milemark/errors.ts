const TABLE: [string, string][] = [
  ["NotAttestor", "Only a listed attestor can attest this milestone."],
  ["NotBeneficiary", "Only the beneficiary can claim released USDC."],
  ["NotSponsor", "Only the sponsor can reclaim after the deadline."],
  ["NotDisputer", "Only the sponsor or a listed attestor can dispute."],
  ["NotCompleted", "That milestone has not reached quorum yet."],
  ["AlreadyAttested", "This wallet already attested that milestone."],
  ["AlreadyCompleted", "That milestone already reached quorum."],
  ["AlreadyDisputed", "That milestone is already disputed."],
  ["AlreadyReclaimed", "That milestone was reclaimed after the deadline."],
  ["ChallengeWindowClosed", "The challenge window has closed."],
  ["InvalidQuorum", "Quorum must be between 1 and the unique attestor count."],
  ["TooManyAttestors", "Too many unique attestors (max 32)."],
  ["NothingToClaim", "Nothing to claim yet — wait for quorum and the challenge window."],
  ["NothingToReclaim", "Nothing left to reclaim."],
  ["DeadlineNotPassed", "The deadline has not passed yet."],
  ["DeadlineInPast", "Deadline must be in the future."],
  ["CampaignNotFound", "No campaign with that id."],
  ["InvalidIndex", "That milestone index does not exist."],
  ["ZeroAddress", "Beneficiary and attestors cannot be the zero address."],
  ["EmptyAttestors", "Add at least one attestor."],
  ["LengthMismatch", "Each description needs a matching amount."],
  ["EmptyMilestones", "Add at least one milestone."],
  ["ZeroAmount", "Milestone amounts must be greater than zero."],
  ["User rejected", "Transaction rejected in wallet."],
  ["user rejected", "Transaction rejected in wallet."],
  ["insufficient funds", "Not enough ETH to pay gas."],
  ["ERC20InsufficientAllowance", "USDC allowance is too low — approve first."],
  ["ERC20InsufficientBalance", "Not enough USDC in this wallet."],
];

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "shortMessage" in err) {
    return String((err as { shortMessage: string }).shortMessage);
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function friendlyError(err: unknown): string {
  const raw = extractErrorMessage(err);
  for (const [needle, message] of TABLE) {
    if (raw.includes(needle)) return message;
  }
  return raw;
}
