import { formatUnits } from "viem";
import { USDC_DECIMALS } from "./chains";

export function formatUsdc(
  amount: bigint | number | null | undefined,
  digits = 2,
): string {
  if (amount === undefined || amount === null) return "—";
  try {
    const value = typeof amount === "bigint" ? amount : BigInt(amount);
    const raw = formatUnits(value, USDC_DECIMALS);
    const [whole, frac = ""] = raw.split(".");
    if (digits === 0) return whole;
    const trimmed = (frac + "000000").slice(0, digits);
    return `${whole}.${trimmed}`;
  } catch {
    return "—";
  }
}

export function shortAddress(address: string | null | undefined): string {
  if (!address || address.length < 12) return address || "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function externalHref(uri: string): string | null {
  const value = uri.trim();
  if (!value) return null;
  if (value.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${value.slice("ipfs://".length)}`;
  }
  if (value.startsWith("ipns://")) {
    return `https://ipfs.io/ipns/${value.slice("ipns://".length)}`;
  }
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return null;
}

export function formatCountdown(
  deadlineSec: bigint | number | null | undefined,
  nowSec: number,
): string {
  if (deadlineSec === undefined || deadlineSec === null) return "—";
  const end = Number(deadlineSec);
  if (!Number.isFinite(end) || end <= 0) return "—";
  const delta = end - nowSec;
  if (delta <= 0) return "Deadline passed";
  const d = Math.floor(delta / 86400);
  const h = Math.floor((delta % 86400) / 3600);
  const m = Math.floor((delta % 3600) / 60);
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${Math.max(m, 0)}m remaining`;
}

export function formatUnix(ts: bigint | number | null | undefined): string {
  if (ts === undefined || ts === null) return "—";
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Date(n * 1000).toLocaleString();
}

export function toBigInt(value: unknown): bigint | undefined {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function friendlyError(err: unknown): string {
  const raw =
    err && typeof err === "object" && "shortMessage" in err
      ? String((err as { shortMessage: string }).shortMessage)
      : err instanceof Error
        ? err.message
        : String(err);

  const table: [string, string][] = [
    ["NotAttestor", "Only a listed attestor can mark this milestone complete."],
    ["NotBeneficiary", "Only the beneficiary can claim released USDC."],
    ["NotSponsor", "Only the sponsor can reclaim after the deadline."],
    ["AlreadyCompleted", "That milestone is already complete."],
    ["AlreadyReclaimed", "That milestone was reclaimed after the deadline."],
    ["NothingToClaim", "Nothing to claim yet — wait for an attestor."],
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

  for (const [needle, message] of table) {
    if (raw.includes(needle)) return message;
  }
  return raw;
}
