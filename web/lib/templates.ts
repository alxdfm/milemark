export type MilestoneDraft = { description: string; amount: string };

export type CampaignTemplate = {
  id: string;
  label: string;
  title: string;
  briefURI: string;
  days: number;
  rows: MilestoneDraft[];
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "hackathon",
    label: "Hackathon prize (3 miles)",
    title: "Hackathon prize",
    briefURI: "https://example.com/prize-brief",
    days: 21,
    rows: [
      { description: "Ship public demo", amount: "200" },
      { description: "Judging walkthrough", amount: "200" },
      { description: "Write-up and repo polish", amount: "100" },
    ],
  },
  {
    id: "retainer",
    label: "Retainer biweekly",
    title: "Engineering retainer",
    briefURI: "",
    days: 42,
    rows: [
      { description: "Sprint 1 (weeks 1–2)", amount: "500" },
      { description: "Sprint 2 (weeks 3–4)", amount: "500" },
      { description: "Sprint 3 (weeks 5–6)", amount: "500" },
    ],
  },
  {
    id: "grant",
    label: "Grant AF-style",
    title: "Public goods grant",
    briefURI: "ipfs://bafybrief",
    days: 90,
    rows: [
      { description: "Research and spec", amount: "1000" },
      { description: "Working prototype", amount: "2000" },
      { description: "Delivery, docs, and handoff", amount: "2000" },
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
