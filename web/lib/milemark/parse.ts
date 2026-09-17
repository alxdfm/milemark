import { isHexAddress, type Address } from "./address";
import type { CampaignView, Milestone } from "./types";

export function parseCampaignId(raw: string): bigint | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

export function toBigInt(value: unknown): bigint | undefined {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function asRecord(raw: unknown): (Record<string, unknown> & unknown[]) | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown> & unknown[];
}

/** Decode `getCampaign` — handles named structs and the `view_` wrapper. */
export function parseCampaignView(raw: unknown): CampaignView | null {
  let data = raw;
  if (data && typeof data === "object" && "view_" in data) {
    data = (data as { view_: unknown }).view_;
  }
  const r = asRecord(data);
  if (!r) return null;
  const sponsor = (r.sponsor ?? r[0]) as Address | undefined;
  const beneficiary = (r.beneficiary ?? r[1]) as Address | undefined;
  if (!sponsor || !beneficiary) return null;
  return {
    sponsor,
    beneficiary,
    title: String(r.title ?? r[2] ?? "Campaign"),
    briefURI: String(r.briefURI ?? r[3] ?? ""),
    deadline: toBigInt(r.deadline ?? r[4]) ?? 0n,
    challengeWindow: toBigInt(r.challengeWindow ?? r[5]) ?? 0n,
    quorum: toNumber(r.quorum ?? r[6], 1),
    milestoneCount: toBigInt(r.milestoneCount ?? r[7]) ?? 0n,
    createdAt: toBigInt(r.createdAt ?? r[8]) ?? 0n,
    claimable: toBigInt(r.claimable ?? r[9]) ?? 0n,
    reclaimable: toBigInt(r.reclaimable ?? r[10]) ?? 0n,
  };
}

function asMilestone(raw: unknown): Milestone | null {
  const r = asRecord(raw);
  if (!r) return null;
  const description = (r.description ?? r[0]) as string | undefined;
  const evidenceURI = String(r.evidenceURI ?? r[1] ?? "");
  const amount = toBigInt(r.amount ?? r[2]);
  const completedAt = toBigInt(r.completedAt ?? r[3]) ?? 0n;
  const attestationCount = toNumber(r.attestationCount ?? r[4], 0);
  const completed = Boolean(r.completed ?? r[5]);
  const claimed = Boolean(r.claimed ?? r[6]);
  const reclaimed = Boolean(r.reclaimed ?? r[7]);
  const disputed = Boolean(r.disputed ?? r[8]);
  if (description === undefined || amount === undefined) return null;
  return {
    description,
    evidenceURI,
    amount,
    completedAt,
    attestationCount,
    completed,
    claimed,
    reclaimed,
    disputed,
  };
}

export function parseMilestones(raw: unknown): Milestone[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "list" in raw
      ? ((raw as { list: unknown }).list as unknown[])
      : null;
  if (!list) return [];
  return list.map(asMilestone).filter((m): m is Milestone => m !== null);
}

export function parseAttestors(raw: unknown): Address[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Address => typeof item === "string" && isHexAddress(item),
  );
}

export function parseFlags(raw: unknown): boolean[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => Boolean(item));
}
