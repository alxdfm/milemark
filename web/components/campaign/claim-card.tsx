import {
  claimReason,
  claimableMiles,
  challengingMiles,
  disputedMiles,
  formatChallengeRemaining,
  formatUsdc,
  type Milestone,
} from "@/lib/milemark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClaimButton } from "./claim-button";

export function ClaimCard({
  campaignId,
  claimable,
  connected,
  isBeneficiary,
  milestones,
  challengeWindow,
  nowSec,
  onSettled,
}: {
  campaignId: bigint;
  claimable: bigint;
  connected: boolean;
  isBeneficiary: boolean;
  milestones: readonly Milestone[];
  challengeWindow: bigint;
  nowSec: number;
  onSettled: () => void;
}) {
  const ready = claimableMiles(milestones, challengeWindow, nowSec);
  const waiting = challengingMiles(milestones, challengeWindow, nowSec);
  const disputed = disputedMiles(milestones);
  const reason = claimReason({
    connected,
    isBeneficiary,
    claimable,
    challengingCount: waiting.length,
    disputedCount: disputed.length,
  });
  const count = ready.length;
  const claimLabel =
    count > 1
      ? `Claim all (${count} miles) ${formatUsdc(claimable)} USDC`
      : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim</CardTitle>
        <CardDescription>
          One <code className="font-mono text-xs">claim</code> transaction collects
          every currently claimable milestone (v3 has no separate batchClaim).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ready.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {ready.map(({ index, milestone }) => (
              <li key={index} className="flex justify-between gap-3">
                <span>
                  {String(index + 1).padStart(2, "0")} {milestone.description}
                </span>
                <span className="font-mono text-accent">
                  {formatUsdc(milestone.amount)} USDC
                </span>
              </li>
            ))}
            <li className="mt-1 flex justify-between gap-3 border-t border-line pt-2 text-xs uppercase tracking-wider text-muted">
              <span>Total this claim</span>
              <span className="font-mono text-foreground">
                {formatUsdc(claimable)} USDC
              </span>
            </li>
          </ul>
        ) : null}

        {waiting.length > 0 ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <p className="font-medium">In challenge — not claimable yet</p>
            <ul className="mt-1 grid gap-1">
              {waiting.map(({ index, milestone }) => (
                <li key={index}>
                  {String(index + 1).padStart(2, "0")} {milestone.description} ·{" "}
                  {formatChallengeRemaining(
                    milestone.completedAt + challengeWindow,
                    nowSec,
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {disputed.length > 0 ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <p className="font-medium">Disputed — never claimable</p>
            <ul className="mt-1 grid gap-1">
              {disputed.map(({ index, milestone }) => (
                <li key={index}>
                  {String(index + 1).padStart(2, "0")} {milestone.description} ·{" "}
                  {formatUsdc(milestone.amount)} USDC
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {reason && <p className="text-xs text-muted">{reason}</p>}
        <ClaimButton
          campaignId={campaignId}
          amount={claimable}
          disabled={!isBeneficiary}
          label={claimLabel}
          onSettled={onSettled}
        />
      </CardContent>
    </Card>
  );
}
