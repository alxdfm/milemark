import { isZeroAddress, parseAddress, type Address } from "./address";
import { parseUsdc } from "./usdc";

export type MilestoneDraft = { description: string; amount: string };

export const MAX_ATTESTORS = 32;

export type CreateCampaignDraft = {
  title: string;
  briefURI: string;
  deadlineLocal: string;
  beneficiary: string;
  attestors: string[];
  quorum: number;
  challengeWindowSec: number;
  rows: MilestoneDraft[];
  escrowConfigured: boolean;
  nowSec?: number;
};

export type ValidCreateCampaign = {
  beneficiary: Address;
  attestors: Address[];
  quorum: number;
  title: string;
  briefURI: string;
  deadlineSec: number;
  challengeWindowSec: number;
  descriptions: string[];
  amounts: bigint[];
  total: bigint;
};

export type CreateValidation =
  | { ok: true; value: ValidCreateCampaign }
  | { ok: false; error: string };

export function parseDeadlineSec(deadlineLocal: string): number {
  const ms = new Date(deadlineLocal).getTime();
  if (!Number.isFinite(ms)) return Number.NaN;
  return Math.floor(ms / 1000);
}

export function parseMilestoneRows(rows: readonly MilestoneDraft[]): {
  descriptions: string[];
  amounts: bigint[];
  total: bigint;
} {
  const descriptions = rows.map((row) => row.description.trim());
  const amounts = rows.map((row) => {
    const trimmed = row.amount.trim();
    if (!trimmed) return 0n;
    return parseUsdc(trimmed) ?? -1n;
  });
  const total = amounts.reduce((sum, amount) => (amount > 0n ? sum + amount : sum), 0n);
  return { descriptions, amounts, total };
}

export function validateCreateCampaign(draft: CreateCampaignDraft): CreateValidation {
  if (!draft.escrowConfigured) {
    return {
      ok: false,
      error: "Set NEXT_PUBLIC_ESCROW_ADDRESS in web/.env.local first.",
    };
  }

  const title = draft.title.trim();
  if (!title) return { ok: false, error: "Title is required." };

  const deadlineSec = parseDeadlineSec(draft.deadlineLocal);
  const nowSec = draft.nowSec ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(deadlineSec) || deadlineSec <= nowSec) {
    return { ok: false, error: "Deadline must be in the future." };
  }

  const beneficiary = parseAddress(draft.beneficiary);
  if (!beneficiary || isZeroAddress(beneficiary)) {
    return { ok: false, error: "Beneficiary must be a valid address." };
  }

  const cleaned = draft.attestors.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return { ok: false, error: "Add at least one attestor." };
  }

  const attestors: Address[] = [];
  for (const raw of cleaned) {
    const parsed = parseAddress(raw);
    if (!parsed || isZeroAddress(parsed)) {
      return { ok: false, error: `Invalid attestor: ${raw}` };
    }
    if (!attestors.some((existing) => existing.toLowerCase() === parsed.toLowerCase())) {
      attestors.push(parsed);
    }
  }

  if (attestors.length > MAX_ATTESTORS) {
    return { ok: false, error: `At most ${MAX_ATTESTORS} unique attestors.` };
  }

  const quorum = draft.quorum;
  if (!Number.isInteger(quorum) || quorum < 1) {
    return { ok: false, error: "Quorum must be an integer ≥ 1." };
  }
  if (quorum > attestors.length) {
    return {
      ok: false,
      error: `Quorum (${quorum}) cannot exceed unique attestors (${attestors.length}).`,
    };
  }

  const window = draft.challengeWindowSec;
  if (!Number.isFinite(window) || window < 0 || !Number.isInteger(window)) {
    return { ok: false, error: "Challenge window must be an integer ≥ 0 seconds." };
  }

  if (draft.rows.length === 0) {
    return { ok: false, error: "Add at least one milestone." };
  }

  const { descriptions, amounts, total } = parseMilestoneRows(draft.rows);
  for (let i = 0; i < draft.rows.length; i++) {
    if (!descriptions[i]) {
      return { ok: false, error: `Milestone ${i + 1} needs a description.` };
    }
    if (amounts[i] <= 0n) {
      return { ok: false, error: `Milestone ${i + 1} needs a USDC amount > 0.` };
    }
  }

  return {
    ok: true,
    value: {
      beneficiary,
      attestors,
      quorum,
      title,
      briefURI: draft.briefURI.trim(),
      deadlineSec,
      challengeWindowSec: window,
      descriptions,
      amounts,
      total,
    },
  };
}
