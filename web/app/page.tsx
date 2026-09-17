import Link from "next/link";
import { CampaignLookup } from "@/components/campaign-lookup";
import { Button } from "@/components/ui/button";
import { DEMO_CAMPAIGN_ID, isEscrowConfigured } from "@/lib/contracts";
import { ESCROW_ADDRESS, explorerAddress } from "@/lib/chains";

const escrowHref = isEscrowConfigured ? explorerAddress(ESCROW_ADDRESS) : undefined;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Arbitrum Sepolia · live v3 escrow
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Lock USDC to the work.
            <span className="block text-muted">Release it by the mile.</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
            Sponsors fund a titled campaign. Listed attestors vote to a quorum.
            After a short challenge window — or immediately if the window is 0 —
            the beneficiary claims released USDC. Disputed or unfinished miles
            return to the sponsor after the deadline.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/create">Create a campaign</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/demo">Judge demo kit</Link>
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
        <TrustItem kicker="Attestation" label="N-of-M quorum" />
        <TrustItem kicker="Challenge" label="Per-campaign window" />
        <TrustItem kicker="Safety" label="Deadline reclaim" />
      </section>

      <section id="how" className="grid gap-4 md:grid-cols-3">
        <Step
          n="01"
          title="Sponsor locks"
          body="Approve USDC, then createCampaign with attestors, quorum, and a challenge window. The total of every milestone amount is pulled in the same flow."
        />
        <Step
          n="02"
          title="Attestors vote"
          body="Each listed attestor may attest a mile once. The mile completes when attestations hit quorum — any-order, evidence optional. During the window the sponsor or an attestor can dispute."
        />
        <Step
          n="03"
          title="Claim or reclaim"
          body="After the window with no dispute, the beneficiary claims. After the deadline the sponsor reclaims incomplete or disputed miles. Completed undisputed amounts stay with the beneficiary."
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
              the activity timeline from escrow events. v3 ABI is live — do not
              point this app at frozen v2 or obsolete v1.
            </p>
          </div>
          {escrowHref ? (
            <a
              href={escrowHref}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-accent hover:underline"
            >
              {ESCROW_ADDRESS.slice(0, 6)}…{ESCROW_ADDRESS.slice(-4)} on Arbiscan
            </a>
          ) : null}
        </div>
        <ul className="mt-6 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>USDC (6 decimals) via OpenZeppelin SafeERC20</li>
          <li>ReentrancyGuard on create, claim, and reclaim</li>
          <li>N-of-M quorum + sticky light dispute during the window</li>
          <li>No oracles, no DAO, no subgraph, no Stylus</li>
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
