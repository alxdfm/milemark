"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { CopyLink, QrBlock } from "@/components/demo/copy-link";
import { Button } from "@/components/ui/button";
import {
  DEMO_CAMPAIGN_ID,
  LIVE_ESCROW_V2,
  LIVE_ESCROW_V3,
  CIRCLE_USDC_ARB_SEPOLIA,
  SMOKE_CAMPAIGN_ID,
  isEscrowConfigured,
  milestoneEscrowAbi,
} from "@/lib/contracts";
import { explorerAddress, ESCROW_ADDRESS, milemarkChain } from "@/lib/chains";
import {
  ZERO_ADDRESS,
  formatUsdc,
  formatWindow,
  parseAttestors,
  parseCampaignId,
  parseCampaignView,
  sameAddress,
} from "@/lib/milemark";

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
    body: "Connect the beneficiary. Claim collects every currently claimable mile in one transaction. A second claim reverts (NothingToClaim). Wallet USDC increases.",
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
    does: "claim the sum of completed, undisputed miles whose challenge window has elapsed — one tx for all currently claimable miles",
  },
];

function FeaturedFacts() {
  const id = parseCampaignId(DEMO_CAMPAIGN_ID);
  const campaign = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "getCampaign",
    args: id !== null ? [id] : undefined,
    chainId: milemarkChain.id,
    query: { enabled: id !== null && isEscrowConfigured, retry: 1 },
  });
  const attestorsQuery = useReadContract({
    address: ESCROW_ADDRESS,
    abi: milestoneEscrowAbi,
    functionName: "getAttestors",
    args: id !== null ? [id] : undefined,
    chainId: milemarkChain.id,
    query: { enabled: id !== null && isEscrowConfigured, retry: 1 },
  });

  const view = parseCampaignView(campaign.data);
  const attestors = parseAttestors(attestorsQuery.data);
  const isSmoke = DEMO_CAMPAIGN_ID === SMOKE_CAMPAIGN_ID;
  const quorumOf = view
    ? `${view.quorum}-of-${attestors.length || "?"}`
    : isSmoke
      ? "1-of-1"
      : "onchain";

  let shape: string;
  if (!view) {
    shape = isSmoke
      ? "Original 1-of-1 smoke campaign. The live 2-of-3 is campaign id 1, which NEXT_PUBLIC_DEMO_CAMPAIGN_ID does not point at."
      : `Featured id ${DEMO_CAMPAIGN_ID} — waiting on chain read.`;
  } else if (view.quorum === 1 && attestors.length <= 1) {
    shape = "This is the original 1-of-1 smoke exhibit, not a 2-of-3.";
  } else {
    shape = `Live ${quorumOf} exhibit.`;
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 text-sm leading-6 text-muted">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        Featured campaign · id {DEMO_CAMPAIGN_ID}
      </p>
      <p className="mt-2 text-foreground">
        {view ? view.title : "MileMark demo"}{" "}
        <span className="text-muted">
          · {quorumOf}
          {view
            ? ` · ${formatWindow(Number(view.challengeWindow))} window · claimable ${formatUsdc(view.claimable)} USDC`
            : ""}
        </span>
      </p>
      <p className="mt-2">{shape}</p>
      {DEMO_CAMPAIGN_ID !== SMOKE_CAMPAIGN_ID ? (
        <p className="mt-2">
          Historical smoke campaign{" "}
          <Link
            className="text-accent hover:underline"
            href={`/campaign/${SMOKE_CAMPAIGN_ID}`}
          >
            id {SMOKE_CAMPAIGN_ID}
          </Link>{" "}
          remains the original 1-of-1 (title “MM v3 Demo Quorum”, 3 USDC, 60s).
        </p>
      ) : (
        <p className="mt-2">
          A live 2-of-3 is already onchain at{" "}
          <Link className="text-accent hover:underline" href="/campaign/1">
            id 1
          </Link>{" "}
          (quorum 2 of 3, 1h window, 10 USDC). It is not the featured id — point{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_DEMO_CAMPAIGN_ID</code>{" "}
          at it to feature it here. For a 2-of-3 you control, use Create → Judge
          demo.
        </p>
      )}
    </div>
  );
}

export function DemoKit() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const appUrl = origin || "https://<this-app>";
  const demoCampaignPath = `/campaign/${DEMO_CAMPAIGN_ID}`;
  const smokePath = `/campaign/${SMOKE_CAMPAIGN_ID}`;
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
            Create → attest to quorum → wait or dispute → claim (all currently
            claimable miles) → reclaim. Everything is onchain on Arbitrum Sepolia.
            No indexer, no offchain DB. Featured id is{" "}
            <code className="font-mono text-xs">{DEMO_CAMPAIGN_ID}</code> via{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_DEMO_CAMPAIGN_ID</code>
            . Copy below is driven by the live campaign — it does not claim id 0
            is 2-of-3 unless the chain says so.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/create">Start the script</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={demoCampaignPath}>Open featured campaign</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <QrBlock value={demoUrl} caption="This page" />
          <QrBlock value={campaignUrl} caption={`Campaign ${DEMO_CAMPAIGN_ID}`} />
        </div>
      </section>

      <FeaturedFacts />

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold">Copyable URLs</h2>
        <CopyLink value={demoUrl} label="Copy demo kit" />
        <CopyLink value={createUrl} label="Copy create" />
        <CopyLink value={campaignUrl} label="Copy featured campaign" />
        {DEMO_CAMPAIGN_ID !== SMOKE_CAMPAIGN_ID ? (
          <CopyLink
            value={`${appUrl}${smokePath}`}
            label="Copy historical smoke (id 0)"
          />
        ) : null}
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
              featured {DEMO_CAMPAIGN_ID}
            </Link>
            {DEMO_CAMPAIGN_ID !== SMOKE_CAMPAIGN_ID ? (
              <>
                {" · "}
                <Link className="text-accent hover:underline" href={smokePath}>
                  smoke {SMOKE_CAMPAIGN_ID}
                </Link>
              </>
            ) : null}
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
