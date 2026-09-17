import { formatUnits } from "viem";
import { USDC_DECIMALS } from "./chains";

export function formatUsdc(amount: bigint, digits = 2): string {
  const raw = formatUnits(amount, USDC_DECIMALS);
  const [whole, frac = ""] = raw.split(".");
  if (digits === 0) return whole;
  const trimmed = (frac + "000000").slice(0, digits);
  return `${whole}.${trimmed}`;
}

export function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function friendlyError(err: unknown): string {
  const raw =
    err && typeof err === "object" && "shortMessage" in err
      ? String((err as { shortMessage: string }).shortMessage)
      : err instanceof Error
        ? err.message
        : String(err);

  const table: [string, string][] = [
    ["NotAttestor", "Only the attestor can mark this milestone complete."],
    ["NotBeneficiary", "Only the beneficiary can claim released USDC."],
    ["AlreadyCompleted", "That milestone is already complete."],
    ["NothingToClaim", "Nothing to claim yet — wait for the attestor."],
    ["CampaignNotFound", "No campaign with that id."],
    ["InvalidIndex", "That milestone index does not exist."],
    ["ZeroAddress", "Beneficiary and attestor cannot be the zero address."],
    ["LengthMismatch", "Each description needs a matching amount."],
    ["EmptyMilestones", "Add at least one milestone."],
    ["ZeroAmount", "Milestone amounts must be greater than zero."],
    ["User rejected", "Transaction rejected in wallet."],
    ["user rejected", "Transaction rejected in wallet."],
    ["insufficient funds", "Not enough ETH to pay gas."],
    ["ERC20InsufficientAllowance", "USDC allowance is too low — approve first."],
    ["ERC20InsufficientBalance", "Not enough USDC in this wallet."],
  ];

  for (const [needle, message] of table) {
    if (raw.includes(needle)) return message;
  }
  return raw;
}
