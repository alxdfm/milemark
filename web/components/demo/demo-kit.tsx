"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CopyLink, QrBlock } from "@/components/demo/copy-link";
import { Button } from "@/components/ui/button";
import {
  DEMO_CAMPAIGN_ID,
  LIVE_ESCROW_V2,
  LIVE_ESCROW_V3,
  CIRCLE_USDC_ARB_SEPOLIA,
  isEscrowConfigured,
} from "@/lib/contracts";
import { explorerAddress, ESCROW_ADDRESS } from "@/lib/chains";
import { ZERO_ADDRESS, sameAddress } from "@/lib/milemark";

const USDC = CIRCLE_USDC_ARB_SEPOLIA;
const escrow = isEscrowConfigured ? ESCROW_ADDRESS : LIVE_ESCROW_V3;
const escrowHref = sameAddress(escrow, ZERO_ADDRESS)
  ? undefined
  : explorerAddress(escrow);
const usdcHref = explorerAddress(USDC);
const v2Href = explorerAddress(LIVE_ESCROW_V2);

const STEPS = [
  {
    n: "01",
    title: "Create (sponsor, ~45s)",
    body: "Connect the sponsor wallet. Open Create, pick “Judge demo (2-of-3, 60s)”. Fill beneficiary + three attestors. Quorum stays 2, challenge window 60 seconds. Approve USDC, then create. Copy the /campaign/{id} URL.",
  },
  {
    n: "02",
    title: "Attest to quorum (two attestors, ~60s)",
    body: "Switch to attestor A. Attest milestone 2 first (any-order) with an ipfs:// or https:// evidence URI. Switch to attestor B and attest the same mile (empty evidence is fine). First non-empty URI sticks. Activity shows MilestoneAttested then MilestoneCompleted.",
  },
  {
    n: "03",
    title: "Window: wait or dispute (~60s)",
    body: "Claim is blocked for 60s. Either wait — the mile turns claimable — or connect the sponsor (or any attestor) and Dispute. A disputed mile is never claimable; the sponsor reclaims it after the deadline.",
  },
  {
    n: "04",
    title: "Claim (beneficiary, ~20s)",
    body: "Connect the beneficiary. Claim released USDC. A second claim reverts (NothingToClaim). Wallet USDC increases.",
  },
  {
    n: "05",
    title: "Reclaim leftover (sponsor)",
    body: "Leave one mile incomplete (or disputed). After the campaign deadline, sponsor Reclaim. Completing a reclaimed mile reverts. Window=0 campaigns skip step 03 for lightning tests.",
  },
];

const ROLES = [
  {
    role: "Sponsor",
    does: "approve + createCampaign, dispute during the window, reclaim incomplete/disputed after deadline",
  },
  {
    role: "Attestor",
    does: "attestMilestone (once per mile), optional dispute during the window. Quorum N distinct attestors completes the mile.",
  },
  {
    role: "Beneficiary",
    does: "claim the sum of completed, undisputed miles whose challenge window has elapsed",
  },
];

export function DemoKit() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const appUrl = origin || "https://<this-app>";
  const demoCampaignPath = `/campaign/${DEMO_CAMPAIGN_ID}`;
  const createUrl = `${appUrl}/create`;
  const demoUrl = `${appUrl}/demo`;
  const campaignUrl = `${appUrl}${demoCampaignPath}`;
  const liveConfigured = isEscrowConfigured;

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            3-minute judge script · v3
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Shareable demo kit
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Create → attest to quorum → wait or dispute → claim → reclaim.
            Everything is onchain on Arbitrum Sepolia. No indexer, no offchain DB.
            Featured id {DEMO_CAMPAIGN_ID} is a live 1-of-1, 60s window, 3 USDC
            campaign (same wallet can be sponsor, attestor, and beneficiary). The
            walkthrough below is how to fund a <em>new</em> 2-of-3 campaign.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/create">Start the script</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={demoCampaignPath}>Open live campaign</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <QrBlock value={demoUrl} caption="This page" />
          <QrBlock value={campaignUrl} caption={`Campaign ${DEMO_CAMPAIGN_ID}`} />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold">Copyable URLs</h2>
        <CopyLink value={demoUrl} label="Copy demo kit" />
        <CopyLink value={createUrl} label="Copy create" />
        <CopyLink value={campaignUrl} label="Copy campaign" />
        {escrowHref ? (
          <CopyLink value={escrowHref} label="Copy Arbiscan" />
        ) : null}
        {!liveConfigured && (
          <p className="text-xs text-amber-200">
            v3 escrow address is not wired yet. After deploy, set{" "}
            <code className="font-mono">NEXT_PUBLIC_ESCROW_ADDRESS</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_DEMO_CAMPAIGN_ID</code>.
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {ROLES.map((item) => (
          <article
            key={item.role}
            className="rounded-xl border border-line bg-surface p-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              Role
            </p>
            <h3 className="mt-2 font-display text-lg font-semibold">{item.role}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{item.does}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">Walkthrough</h2>
        <ol className="grid gap-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="rounded-xl border border-line bg-surface p-5"
            >
              <p className="font-mono text-xs text-accent">{step.n}</p>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-dashed border-line bg-surface/60 p-6">
        <h2 className="font-display text-xl font-semibold">Live links</h2>
        <ul className="mt-4 grid gap-2 text-sm text-muted">
          <li>
            App:{" "}
            <Link className="text-accent hover:underline" href="/">
              home
            </Link>
            {" · "}
            <Link className="text-accent hover:underline" href="/create">
              create
            </Link>
            {" · "}
            <Link className="text-accent hover:underline" href={demoCampaignPath}>
              campaign {DEMO_CAMPAIGN_ID}
            </Link>
          </li>
          <li>
            Escrow v3:{" "}
            {escrowHref ? (
              <a
                className="font-mono text-accent hover:underline"
                href={escrowHref}
                target="_blank"
                rel="noreferrer"
              >
                {escrow}
              </a>
            ) : (
              <span className="font-mono">not deployed in this build</span>
            )}
          </li>
          <li>
            USDC:{" "}
            {usdcHref ? (
              <a
                className="font-mono text-accent hover:underline"
                href={usdcHref}
                target="_blank"
                rel="noreferrer"
              >
                {USDC}
              </a>
            ) : (
              <span className="font-mono">{USDC}</span>
            )}
          </li>
          <li>
            Frozen v2 (do not wire):{" "}
            {v2Href ? (
              <a
                className="font-mono text-xs text-muted hover:underline"
                href={v2Href}
                target="_blank"
                rel="noreferrer"
              >
                {LIVE_ESCROW_V2}
              </a>
            ) : (
              <span className="font-mono text-xs">{LIVE_ESCROW_V2}</span>
            )}
          </li>
        </ul>
      </section>
    </div>
  );
}
