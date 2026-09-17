import { explorerAddress } from "@/lib/chains";
import { formatUsdc, shortAddress, type CampaignView, type CampaignTotals } from "@/lib/milemark";
import { linkLabel, publicHref } from "@/lib/links";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeadlineLine } from "./deadline-line";
import { RoleChip } from "./role-chip";

export function CampaignHeaderCard({
  id,
  view,
  attestors,
  totals,
  isSponsor,
  isAttestor,
  isBeneficiary,
}: {
  id: bigint;
  view: CampaignView;
  attestors: readonly `0x${string}`[];
  totals: CampaignTotals;
  isSponsor: boolean;
  isAttestor: boolean;
  isBeneficiary: boolean;
}) {
  const sponsorExplorer = explorerAddress(view.sponsor);
  const briefHref = publicHref(view.briefURI);

  return (
    <Card>
      <CardHeader>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Campaign {id.toString()}
        </p>
        <CardTitle className="mt-1">{view.title}</CardTitle>
        <CardDescription className="mt-2">
          {Number(view.milestoneCount)} milestones · {formatUsdc(totals.total)}{" "}
          USDC locked
          {view.briefURI ? (
            <>
              {" · "}
              {briefHref ? (
                <a
                  className="text-accent hover:underline"
                  href={briefHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {linkLabel(view.briefURI)}
                </a>
              ) : (
                <span className="text-muted" title={view.briefURI}>
                  brief (unsupported URI)
                </span>
              )}
            </>
          ) : null}
        </CardDescription>
        <DeadlineLine deadline={view.deadline} reclaimable={view.reclaimable} />
        <div className="mt-3 flex flex-wrap gap-2">
          <RoleChip label="Sponsor" mine={isSponsor} />
          <RoleChip label="Attestor" mine={isAttestor} />
          <RoleChip label="Beneficiary" mine={isBeneficiary} />
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${totals.progressPct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
          {totals.completeCount}/{Number(view.milestoneCount)} milestones complete
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted">Sponsor</span>
          {sponsorExplorer ? (
            <a
              className="font-mono hover:text-accent"
              href={sponsorExplorer}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddress(view.sponsor)}
            </a>
          ) : (
            <span className="font-mono">{shortAddress(view.sponsor)}</span>
          )}
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted">Beneficiary</span>
          <span className="font-mono">{shortAddress(view.beneficiary)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted">Attestors ({attestors.length})</span>
          {attestors.map((account) => (
            <span key={account} className="font-mono text-xs">
              {shortAddress(account)}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-ink p-3 text-center">
          <div>
            <p className="text-[10px] uppercase text-muted">Released</p>
            <p className="mt-1 font-mono text-sm">{formatUsdc(totals.released)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted">Claimable</p>
            <p className="mt-1 font-mono text-sm text-accent">
              {formatUsdc(view.claimable)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted">Paid</p>
            <p className="mt-1 font-mono text-sm">{formatUsdc(totals.paid)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
