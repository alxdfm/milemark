import Link from "next/link";
import { CampaignLookup } from "@/components/campaign-lookup";
import { Button } from "@/components/ui/button";
import { DEMO_CAMPAIGN_ID, LIVE_ESCROW_V2 } from "@/lib/contracts";
import { explorerAddress } from "@/lib/chains";

const escrowHref = explorerAddress(LIVE_ESCROW_V2);

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Arbitrum Sepolia · live v2 escrow
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Lock USDC to the work.
            <span className="block text-muted">Release it by the mile.</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
            Sponsors fund a titled campaign. Any listed attestor can mark a
            milestone complete — even out of order — with optional evidence. The
            beneficiary claims released USDC. After the deadline, unfinished
            miles return to the sponsor.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/create">Create a campaign</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={`/campaign/${DEMO_CAMPAIGN_ID}`}>Open live demo</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Open a campaign
          </p>
          <p className="mt-2 mb-4 text-sm text-muted">
            Enter a campaign id from a create receipt, or jump to the{" "}
            <Link
              className="text-accent underline"
              href={`/campaign/${DEMO_CAMPAIGN_ID}`}
            >
              featured demo (id {DEMO_CAMPAIGN_ID})
            </Link>
            .
          </p>
          <CampaignLookup />
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        <TrustItem kicker="Settlement" label="Circle testnet USDC" />
        <TrustItem kicker="Attestation" label="1-of-n attestor set" />
        <TrustItem kicker="Completion" label="Any-order miles" />
        <TrustItem kicker="Safety" label="Deadline reclaim" />
      </section>

      <section id="how" className="grid gap-4 md:grid-cols-3">
        <Step
          n="01"
          title="Sponsor locks"
          body="Approve USDC, then createCampaign. The total of every milestone amount is pulled in the same flow and sits in the escrow."
        />
        <Step
          n="02"
          title="Attestor marks"
          body="Any listed attestor can complete miles out of order, with an optional evidence URI. After the deadline, the sponsor reclaims unfinished ones."
        />
        <Step
          n="03"
          title="Beneficiary claims"
          body="claim pays the sum of completed, unclaimed milestones. A second claim with nothing new reverts. No one else can withdraw."
        />
      </section>

      <section className="rounded-xl border border-dashed border-line bg-surface/60 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              One Solidity contract. No indexer.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              The UI reads getCampaign / getMilestones / getAttestors and builds
              the activity timeline from escrow events. v2 ABI is live — do not
              point this app at obsolete v1.
            </p>
          </div>
          {escrowHref ? (
            <a
              href={escrowHref}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-accent hover:underline"
            >
              {LIVE_ESCROW_V2.slice(0, 6)}…{LIVE_ESCROW_V2.slice(-4)} on Arbiscan
            </a>
          ) : null}
        </div>
        <ul className="mt-6 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>USDC (6 decimals) via OpenZeppelin SafeERC20</li>
          <li>ReentrancyGuard on create, claim, and reclaim</li>
          <li>Custom errors + CampaignCreated / MilestoneCompleted / Claimed / Reclaimed</li>
          <li>No oracles, no DAO, no subgraph</li>
        </ul>
      </section>
    </main>
  );
}

function TrustItem({ kicker, label }: { kicker: string; label: string }) {
  return (
    <article className="bg-surface px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {kicker}
      </p>
      <p className="mt-1 text-sm font-medium">{label}</p>
    </article>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <p className="font-mono text-xs text-accent">{n}</p>
      <h2 className="mt-3 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}
