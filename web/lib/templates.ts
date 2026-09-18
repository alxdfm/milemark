import type { MilestoneDraft } from "@/lib/milemark";

export type { MilestoneDraft };

export type CampaignTemplate = {
  id: string;
  label: string;
  title: string;
  briefURI: string;
  days: number;
  quorum: number;
  challengeWindowSec: number;
  attestorSlots: number;
  rows: MilestoneDraft[];
  /** One-line v3 summary shown on the create-form template bar. */
  summary: string;
};

/** Challenge-window presets shown on the create form. */
export const CHALLENGE_WINDOW_PRESETS: { label: string; seconds: number }[] = [
  { label: "None (instant claim)", seconds: 0 },
  { label: "60 seconds (demo)", seconds: 60 },
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86400 },
];

function summary(template: Omit<CampaignTemplate, "summary">): string {
  const total = template.rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const window =
    template.challengeWindowSec === 0
      ? "instant claim"
      : template.challengeWindowSec < 3600
        ? `${template.challengeWindowSec}s window`
        : template.challengeWindowSec < 86400
          ? `${template.challengeWindowSec / 3600}h window`
          : `${template.challengeWindowSec / 86400}d window`;
  return `${template.quorum}-of-${template.attestorSlots} · ${window} · ${template.rows.length} miles · ${total} USDC · ${template.days}d deadline`;
}

const JUDGE: Omit<CampaignTemplate, "summary"> = {
  id: "judge",
  label: "Judge demo (2-of-3, 60s)",
  title: "MileMark v3 judge demo",
  briefURI: "https://github.com/callydus/milemark",
  days: 7,
  quorum: 2,
  challengeWindowSec: 60,
  attestorSlots: 3,
  rows: [
    { description: "Ship public demo", amount: "4" },
    { description: "Judge walkthrough", amount: "6" },
  ],
};

const FREELANCE: Omit<CampaignTemplate, "summary"> = {
  id: "freelance",
  label: "Freelance",
  title: "Freelance milestone retainer",
  briefURI: "https://example.com/brief",
  days: 14,
  quorum: 2,
  challengeWindowSec: 86400,
  attestorSlots: 3,
  rows: [
    { description: "Kickoff + written spec", amount: "20" },
    { description: "Build against the spec", amount: "50" },
    { description: "Handoff + docs", amount: "30" },
  ],
};

const GRANT: Omit<CampaignTemplate, "summary"> = {
  id: "grant",
  label: "Grant",
  title: "Milestone grant",
  briefURI: "https://example.com/grant",
  days: 60,
  quorum: 2,
  challengeWindowSec: 86400,
  attestorSlots: 3,
  rows: [
    { description: "MVP on testnet", amount: "25" },
    { description: "Audit notes addressed", amount: "35" },
    { description: "Mainnet / handoff", amount: "40" },
  ],
};

const DELIVERY: Omit<CampaignTemplate, "summary"> = {
  id: "delivery",
  label: "Delivery",
  title: "Product delivery escrow",
  briefURI: "https://example.com/delivery",
  days: 21,
  quorum: 2,
  challengeWindowSec: 3600,
  attestorSlots: 2,
  rows: [
    { description: "Working build on the agreed branch", amount: "40" },
    { description: "Acceptance + handover", amount: "60" },
  ],
};

/**
 * Create-form presets (not onchain). Defaults match v3 validation:
 * `1 <= quorum <= unique attestors`, amounts > 0, window >= 0, future deadline.
 * Default template is the 60s judge demo — that is not live campaign 0.
 */
export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  { ...JUDGE, summary: summary(JUDGE) },
  { ...FREELANCE, summary: summary(FREELANCE) },
  { ...GRANT, summary: summary(GRANT) },
  { ...DELIVERY, summary: summary(DELIVERY) },
];

export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function deadlineDaysFromNow(days: number): string {
  return toDatetimeLocal(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}
