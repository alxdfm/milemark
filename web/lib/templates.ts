import type { MilestoneDraft } from "@/lib/milemark";

export type { MilestoneDraft };

export type CampaignTemplate = {
  id: string;
  label: string;
  title: string;
  briefURI: string;
  days: number;
  rows: MilestoneDraft[];
};

/** Testnet-friendly amounts used by the create form. */
export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "hackathon",
    label: "Hackathon prize",
    title: "Hackathon prize",
    briefURI: "https://example.com/brief",
    days: 21,
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
