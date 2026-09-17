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
};

/** Challenge-window presets shown on the create form. */
export const CHALLENGE_WINDOW_PRESETS: { label: string; seconds: number }[] = [
  { label: "None (instant claim)", seconds: 0 },
  { label: "60 seconds (demo)", seconds: 60 },
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86400 },
];

/** Testnet-friendly amounts used by the create form. */
export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
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
  },
  {
    id: "hackathon",
    label: "Hackathon prize",
    title: "Hackathon prize",
    briefURI: "https://example.com/brief",
    days: 21,
    quorum: 1,
    challengeWindowSec: 86400,
    attestorSlots: 1,
    rows: [
      { description: "Ship public demo", amount: "40" },
      { description: "Pass review", amount: "30" },
      { description: "Handoff + docs", amount: "30" },
    ],
  },
  {
    id: "retainer",
    label: "Retainer biweekly",
    title: "Biweekly retainer",
    briefURI: "",
    days: 30,
    quorum: 1,
    challengeWindowSec: 86400,
    attestorSlots: 2,
    rows: [
      { description: "Sprint A delivery", amount: "50" },
      { description: "Sprint B delivery", amount: "50" },
    ],
  },
  {
    id: "grant",
    label: "Grant AF-style",
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
  },
];

export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function deadlineDaysFromNow(days: number): string {
  return toDatetimeLocal(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}
