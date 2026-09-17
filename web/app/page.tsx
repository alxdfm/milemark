import Link from "next/link";
import { CampaignLookup } from "@/components/campaign-lookup";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="flex flex-col gap-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Arbitrum Sepolia · milestone escrow v2
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Lock USDC to the work.
            <span className="block text-muted">Release it by the mile.</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
            Sponsors fund a titled campaign with a deadline. Any listed attestor
            can mark a mile complete (1-of-n) and attach evidence. The
            beneficiary claims released USDC. After the deadline the sponsor
            reclaims what is still locked.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/create">Create a campaign</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#how">How it works</a>
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Open a campaign
          </p>
          <p className="mt-2 mb-4 text-sm text-muted">
            Ids start at 0 and increment with each create.
          </p>
          <CampaignLookup />
        </div>
      </section>

      <section id="how" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Step
          n="01"
          title="Sponsor locks"
          body="Approve USDC, then createCampaign with title, brief URI, attestor set, deadline, and mile amounts."
        />
        <Step
          n="02"
          title="Attestor marks"
          body="Any listed attestor calls completeMilestone with optional evidence. Any-order — a later mile can finish first."
        />
        <Step
          n="03"
          title="Beneficiary claims"
          body="claim pays completed, unclaimed miles. A second claim with nothing new reverts."
        />
        <Step
          n="04"
          title="Sponsor reclaims"
          body="After the deadline, reclaim pulls USDC still sitting on incomplete miles. Released miles stay with the beneficiary."
        />
      </section>

      <section className="rounded-xl border border-dashed border-line bg-surface/60 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">v2 MVP</h2>
        <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>Campaign title + brief URI</li>
          <li>1-of-n attestor set</li>
          <li>Deadline + sponsor reclaim of incomplete miles</li>
          <li>Evidence URI on complete; activity from contract logs</li>
        </ul>
      </section>
    </main>
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
